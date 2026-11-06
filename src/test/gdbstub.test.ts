import * as assert from "assert";
import * as path from "path";
import { Uri } from "vscode";
import {
  addGdbStubManifestDependency,
  enableSdkconfigOption,
  hasIdfComponentRegister,
} from "../espIdf/gdbstub/configurationText";
import {
  configureProjectForRuntimeGdbStub,
  GdbStubProjectIo,
} from "../espIdf/gdbstub/configureProject";
import { mergeGdbinitSourceCommands } from "../debugAdapter/debugConfProvider";
import { ErrorCode } from "../common/error/types";
import { getErrorDescriptor } from "../common/error/registry";
import {
  RUNTIME_GDBSTUB_LAUNCH_NAME,
  RUNTIME_GDBSTUB_SESSION_ID,
  RuntimeGdbStubLaunchConfig,
  applyRuntimeGdbStubDebugConfig,
  isRuntimeGdbStubFirmwareMissing,
  isSdkconfigOptionEnabled,
  mergeRuntimeGdbStubLaunchConfigurations,
  parseHardwareDebugLimit,
  parseMonitorBaudRate,
  shouldUseRuntimeGdbStub,
  toGdbSerialPort,
  toNodeSerialPortPath,
} from "../espIdf/gdbstub/debugConfig";
import {
  bufferHasGdbStubStopPacket,
  GdbStubByteSource,
  readGdbStubStopPacket,
} from "../espIdf/gdbstub/uart";

const option = "CONFIG_ESP_SYSTEM_GDBSTUB_RUNTIME";

suite("GDB Stub project configuration", () => {
  test("hasIdfComponentRegister ignores comments, strings, and unclosed calls", () => {
    assert.strictEqual(
      hasIdfComponentRegister(
        'idf_component_register(SRCS "hello_world_main.c")'
      ),
      true
    );
    assert.strictEqual(
      hasIdfComponentRegister("# idf_component_register(SRCS dummy.c)\n"),
      false
    );
    assert.strictEqual(
      hasIdfComponentRegister('message("idf_component_register(")\n'),
      false
    );
    assert.strictEqual(
      hasIdfComponentRegister("idf_component_register(SRCS main.c"),
      false
    );
  });

  const manifestDependency = [
    "  esp_gdbstub:",
    "    path: ${IDF_PATH}/components/esp_gdbstub",
    "    require: private",
  ].join("\n");

  test("adds a private esp_gdbstub dependency to an empty manifest", () => {
    const result = addGdbStubManifestDependency("");
    assert.strictEqual(
      result,
      ["dependencies:", manifestDependency, ""].join("\n")
    );
    assert.strictEqual(addGdbStubManifestDependency(result), result);
  });

  test("appends esp_gdbstub after existing dependencies", () => {
    const input = [
      "dependencies:",
      '  espressif/led_strip: "^3.0.0"',
      "",
    ].join("\n");
    const result = addGdbStubManifestDependency(input);
    assert.strictEqual(
      result,
      [
        "dependencies:",
        '  espressif/led_strip: "^3.0.0"',
        manifestDependency,
        "",
      ].join("\n")
    );
  });

  test("keeps a nested dependency and the next top-level key intact", () => {
    const input = [
      "dependencies:",
      "  espressif/led_strip:",
      '    version: "^3.0.0"',
      "",
      "description: blink",
      "",
    ].join("\n");
    const result = addGdbStubManifestDependency(input);
    assert.strictEqual(
      result,
      [
        "dependencies:",
        "  espressif/led_strip:",
        '    version: "^3.0.0"',
        "",
        manifestDependency,
        "description: blink",
        "",
      ].join("\n")
    );
  });

  test("uses the existing dependency indent", () => {
    const input = [
      "dependencies:",
      '    espressif/led_strip: "^3.0.0"',
      "",
    ].join("\n");
    const result = addGdbStubManifestDependency(input);
    assert.strictEqual(
      result,
      [
        "dependencies:",
        '    espressif/led_strip: "^3.0.0"',
        "    esp_gdbstub:",
        "      path: ${IDF_PATH}/components/esp_gdbstub",
        "      require: private",
        "",
      ].join("\n")
    );
  });

  test("does not duplicate an existing esp_gdbstub manifest dependency", () => {
    const input = [
      "dependencies:",
      "  # esp_gdbstub: ignored",
      "  esp_gdbstub:",
      "    version: '*'",
      "",
    ].join("\n");
    assert.strictEqual(addGdbStubManifestDependency(input), input);
  });

  test("preserves CRLF when adding the manifest dependency", () => {
    const input = ["dependencies:", '  espressif/led_strip: "^3.0.0"', ""].join(
      "\r\n"
    );
    const result = addGdbStubManifestDependency(input);
    assert.ok(result.includes("\r\n  esp_gdbstub:\r\n"));
    assert.ok(!result.includes("\n  esp_gdbstub:\n"));
  });

  const sdkconfigCases: {
    name: string;
    input: string;
    expected: string;
  }[] = [
    {
      name: "enables a disabled sdkconfig option",
      input: "# CONFIG_ESP_SYSTEM_GDBSTUB_RUNTIME is not set\nCONFIG_OTHER=y\n",
      expected: "CONFIG_ESP_SYSTEM_GDBSTUB_RUNTIME=y\nCONFIG_OTHER=y\n",
    },
    {
      name: "appends a missing sdkconfig option with existing line endings",
      input: "CONFIG_OTHER=y\r\n",
      expected: "CONFIG_OTHER=y\r\nCONFIG_ESP_SYSTEM_GDBSTUB_RUNTIME=y\r\n",
    },
    {
      name: "replaces an explicit n value",
      input: "CONFIG_ESP_SYSTEM_GDBSTUB_RUNTIME=n\n",
      expected: "CONFIG_ESP_SYSTEM_GDBSTUB_RUNTIME=y\n",
    },
    {
      name: "leaves an already enabled option unchanged",
      input: "CONFIG_ESP_SYSTEM_GDBSTUB_RUNTIME=y\nCONFIG_OTHER=y\n",
      expected: "CONFIG_ESP_SYSTEM_GDBSTUB_RUNTIME=y\nCONFIG_OTHER=y\n",
    },
    {
      name: "appends to an empty sdkconfig",
      input: "",
      expected: "CONFIG_ESP_SYSTEM_GDBSTUB_RUNTIME=y\n",
    },
    {
      name: "keeps the first matching line and drops duplicates",
      input:
        "CONFIG_ESP_SYSTEM_GDBSTUB_RUNTIME=n\nCONFIG_OTHER=y\nCONFIG_ESP_SYSTEM_GDBSTUB_RUNTIME=n\n",
      expected: "CONFIG_ESP_SYSTEM_GDBSTUB_RUNTIME=y\nCONFIG_OTHER=y\n",
    },
    {
      name: "preserves a file without a trailing newline",
      input: "CONFIG_OTHER=y",
      expected: "CONFIG_OTHER=y\nCONFIG_ESP_SYSTEM_GDBSTUB_RUNTIME=y",
    },
    {
      name: "strips only the actual trailing terminator with mixed endings",
      input: "CONFIG_OTHER=y\r\nCONFIG_ALSO=y\n",
      expected:
        "CONFIG_OTHER=y\r\nCONFIG_ALSO=y\r\nCONFIG_ESP_SYSTEM_GDBSTUB_RUNTIME=y\r\n",
    },
  ];

  for (const sdkconfigCase of sdkconfigCases) {
    test(sdkconfigCase.name, () => {
      const result = enableSdkconfigOption(sdkconfigCase.input, option);
      assert.strictEqual(result, sdkconfigCase.expected);
      assert.strictEqual(
        enableSdkconfigOption(result, option),
        result,
        "enableSdkconfigOption should be idempotent"
      );
    });
  }
});

suite("GDB Stub project orchestration", () => {
  function wsFile(workspacePath: Uri, ...segments: string[]): string {
    return Uri.file(path.join(workspacePath.fsPath, ...segments)).fsPath;
  }

  function createTestIo(options: {
    files: Record<string, string>;
    pick?: (
      items: { label: string; filePath: string }[]
    ) => Promise<string | undefined>;
    editorRunning?: boolean;
    setInEditor?: () => Promise<void>;
  }) {
    const files: Record<string, string> = {};
    for (const [filePath, contents] of Object.entries(options.files)) {
      files[Uri.file(filePath).fsPath] = contents;
    }
    const writes: string[] = [];
    let editorSetCalls = 0;
    let editorCloseCalls = 0;
    let reconfigureCalls = 0;
    const io: GdbStubProjectIo = {
      pathExists: async (filePath) =>
        Object.prototype.hasOwnProperty.call(files, Uri.file(filePath).fsPath),
      readFile: async (filePath) => {
        const key = Uri.file(filePath).fsPath;
        if (!Object.prototype.hasOwnProperty.call(files, key)) {
          throw new Error(`missing ${filePath}`);
        }
        return files[key];
      },
      findCmakeFiles: async () =>
        Object.keys(files)
          .filter((filePath) => path.basename(filePath) === "CMakeLists.txt")
          .map((filePath) => Uri.file(filePath)),
      pickCmakeFile: async (items) => {
        if (options.pick) {
          return options.pick(items);
        }
        return items[0]?.filePath;
      },
      replaceFileText: async (filePath, newText) => {
        const key = Uri.file(filePath).fsPath;
        files[key] = newText;
        writes.push(key);
      },
      resolveSdkconfigPath: async (workspacePath) =>
        wsFile(workspacePath, "sdkconfig"),
      sdkconfigEditorIsRunning: () => !!options.editorRunning,
      setRuntimeGdbStubInEditor: async () => {
        editorSetCalls++;
        if (options.setInEditor) {
          await options.setInEditor();
        }
      },
      closeSdkconfigEditor: () => {
        editorCloseCalls++;
      },
      reconfigureProject: async () => {
        reconfigureCalls++;
      },
    };
    return {
      io,
      files,
      writes,
      getEditorSetCalls: () => editorSetCalls,
      getEditorCloseCalls: () => editorCloseCalls,
      getReconfigureCalls: () => reconfigureCalls,
    };
  }

  test("prefers main/CMakeLists.txt over other components", async () => {
    const workspacePath = Uri.file(path.join(__dirname, "gdbstub-ws-main"));
    const mainPath = wsFile(workspacePath, "main", "CMakeLists.txt");
    const otherPath = wsFile(
      workspacePath,
      "components",
      "foo",
      "CMakeLists.txt"
    );
    const sdkconfigPath = wsFile(workspacePath, "sdkconfig");
    const { io, files, writes, getEditorSetCalls, getReconfigureCalls } =
      createTestIo({
      files: {
        [mainPath]: 'idf_component_register(SRCS "main.c")',
        [otherPath]: 'idf_component_register(SRCS "foo.c")',
      },
    });

    const result = await configureProjectForRuntimeGdbStub(workspacePath, io);

    const manifestPath = wsFile(workspacePath, "main", "idf_component.yml");
    assert.strictEqual(result, "updated");
    assert.strictEqual(files[mainPath], 'idf_component_register(SRCS "main.c")');
    assert.ok(!files[otherPath].includes("esp_gdbstub"));
    assert.match(files[manifestPath], /require: private/);
    assert.match(
      files[manifestPath],
      /path: \$\{IDF_PATH\}\/components\/esp_gdbstub/
    );
    assert.ok(
      files[sdkconfigPath].includes("CONFIG_ESP_SYSTEM_GDBSTUB_RUNTIME=y")
    );
    assert.deepStrictEqual(writes, [manifestPath, sdkconfigPath]);
    assert.strictEqual(getEditorSetCalls(), 0);
    assert.strictEqual(getReconfigureCalls(), 1);
  });

  test("returns cancelled when the component QuickPick is dismissed", async () => {
    const workspacePath = Uri.file(path.join(__dirname, "gdbstub-ws-cancel"));
    const firstPath = wsFile(
      workspacePath,
      "components",
      "a",
      "CMakeLists.txt"
    );
    const secondPath = wsFile(
      workspacePath,
      "components",
      "b",
      "CMakeLists.txt"
    );
    const { io, writes, getEditorSetCalls } = createTestIo({
      files: {
        [firstPath]: "idf_component_register(SRCS a.c)",
        [secondPath]: "idf_component_register(SRCS b.c)",
      },
      pick: async () => undefined,
    });

    const result = await configureProjectForRuntimeGdbStub(workspacePath, io);

    assert.strictEqual(result, "cancelled");
    assert.deepStrictEqual(writes, []);
    assert.strictEqual(getEditorSetCalls(), 0);
  });

  test("throws when no idf_component_register file exists", async () => {
    const workspacePath = Uri.file(path.join(__dirname, "gdbstub-ws-none"));
    const rootCmake = wsFile(workspacePath, "CMakeLists.txt");
    const { io } = createTestIo({
      files: {
        [rootCmake]: "cmake_minimum_required(VERSION 3.16)\nproject(hello)",
      },
    });

    await assert.rejects(
      () => configureProjectForRuntimeGdbStub(workspacePath, io),
      /idf_component_register/
    );
  });

  test("returns unchanged when the manifest and sdkconfig are already configured", async () => {
    const workspacePath = Uri.file(path.join(__dirname, "gdbstub-ws-done"));
    const mainPath = wsFile(workspacePath, "main", "CMakeLists.txt");
    const sdkconfigPath = wsFile(workspacePath, "sdkconfig");
    const manifestPath = wsFile(workspacePath, "main", "idf_component.yml");
    const { io, writes, getEditorSetCalls, getReconfigureCalls } = createTestIo({
      files: {
        [mainPath]: "idf_component_register(SRCS main.c)",
        [manifestPath]:
          "dependencies:\n  esp_gdbstub:\n    path: ${IDF_PATH}/components/esp_gdbstub\n    require: private\n",
        [sdkconfigPath]: "CONFIG_ESP_SYSTEM_GDBSTUB_RUNTIME=y\n",
      },
    });

    const result = await configureProjectForRuntimeGdbStub(workspacePath, io);

    assert.strictEqual(result, "unchanged");
    assert.deepStrictEqual(writes, []);
    assert.strictEqual(getEditorSetCalls(), 0);
    assert.strictEqual(getReconfigureCalls(), 0);
  });

  test("updates the manifest without touching sdkconfig when the option is already set", async () => {
    const workspacePath = Uri.file(path.join(__dirname, "gdbstub-ws-cmake"));
    const mainPath = wsFile(workspacePath, "main", "CMakeLists.txt");
    const manifestPath = wsFile(workspacePath, "main", "idf_component.yml");
    const sdkconfigPath = wsFile(workspacePath, "sdkconfig");
    const { io, files, writes, getEditorSetCalls, getReconfigureCalls } =
      createTestIo({
      files: {
        [mainPath]: "idf_component_register(SRCS main.c)",
        [sdkconfigPath]: "CONFIG_ESP_SYSTEM_GDBSTUB_RUNTIME=y\n",
      },
    });

    const result = await configureProjectForRuntimeGdbStub(workspacePath, io);

    assert.strictEqual(result, "updated");
    assert.strictEqual(files[mainPath], "idf_component_register(SRCS main.c)");
    assert.match(files[manifestPath], /require: private/);
    assert.deepStrictEqual(writes, [manifestPath]);
    assert.strictEqual(getEditorSetCalls(), 0);
    assert.strictEqual(getReconfigureCalls(), 1);
  });

  test("writes sdkconfig without rewriting the manifest when the dependency exists", async () => {
    const workspacePath = Uri.file(path.join(__dirname, "gdbstub-ws-kconfig"));
    const mainPath = wsFile(workspacePath, "main", "CMakeLists.txt");
    const manifestPath = wsFile(workspacePath, "main", "idf_component.yml");
    const sdkconfigPath = wsFile(workspacePath, "sdkconfig");
    const { io, files, writes, getEditorSetCalls, getReconfigureCalls } =
      createTestIo({
      files: {
        [mainPath]: "idf_component_register(SRCS main.c)",
        [manifestPath]:
          "dependencies:\n  esp_gdbstub:\n    require: private\n",
        [sdkconfigPath]: "CONFIG_OTHER=y\n",
      },
    });

    const result = await configureProjectForRuntimeGdbStub(workspacePath, io);

    assert.strictEqual(result, "updated");
    assert.deepStrictEqual(writes, [sdkconfigPath]);
    assert.ok(
      files[sdkconfigPath].includes("CONFIG_ESP_SYSTEM_GDBSTUB_RUNTIME=y")
    );
    assert.strictEqual(getEditorSetCalls(), 0);
    assert.strictEqual(getReconfigureCalls(), 1);
  });

  test("sets the option through a running SDK Configuration Editor", async () => {
    const workspacePath = Uri.file(path.join(__dirname, "gdbstub-ws-editor"));
    const mainPath = wsFile(workspacePath, "main", "CMakeLists.txt");
    const manifestPath = wsFile(workspacePath, "main", "idf_component.yml");
    const sdkconfigPath = wsFile(workspacePath, "sdkconfig");
    const {
      io,
      files,
      writes,
      getEditorSetCalls,
      getEditorCloseCalls,
      getReconfigureCalls,
    } = createTestIo({
      files: {
        [mainPath]: "idf_component_register(SRCS main.c)",
        [manifestPath]:
          "dependencies:\n  esp_gdbstub:\n    require: private\n",
        [sdkconfigPath]: "CONFIG_OTHER=y\n",
      },
      editorRunning: true,
    });

    const result = await configureProjectForRuntimeGdbStub(workspacePath, io);

    assert.strictEqual(result, "updated");
    assert.deepStrictEqual(writes, []);
    assert.strictEqual(files[sdkconfigPath], "CONFIG_OTHER=y\n");
    assert.strictEqual(getEditorSetCalls(), 1);
    assert.strictEqual(getEditorCloseCalls(), 0);
    assert.strictEqual(getReconfigureCalls(), 0);
  });

  test("writes sdkconfig and reconfigures when the running editor cannot see the new component", async () => {
    const workspacePath = Uri.file(path.join(__dirname, "gdbstub-ws-fail"));
    const mainPath = wsFile(workspacePath, "main", "CMakeLists.txt");
    const manifestPath = wsFile(workspacePath, "main", "idf_component.yml");
    const sdkconfigPath = wsFile(workspacePath, "sdkconfig");
    const {
      io,
      files,
      getEditorSetCalls,
      getEditorCloseCalls,
      getReconfigureCalls,
    } = createTestIo({
      files: {
        [mainPath]: "idf_component_register(SRCS main.c)",
        [sdkconfigPath]: "CONFIG_OTHER=y\n",
      },
      editorRunning: true,
      setInEditor: async () => {
        throw new Error("not visible");
      },
    });

    const result = await configureProjectForRuntimeGdbStub(workspacePath, io);

    assert.strictEqual(result, "updated");
    assert.strictEqual(getEditorSetCalls(), 0);
    assert.strictEqual(getEditorCloseCalls(), 1);
    assert.strictEqual(getReconfigureCalls(), 1);
    assert.match(files[manifestPath], /require: private/);
    assert.ok(
      files[sdkconfigPath].includes("CONFIG_ESP_SYSTEM_GDBSTUB_RUNTIME=y")
    );
  });

  test("writes sdkconfig when the running editor rejects an already added component", async () => {
    const workspacePath = Uri.file(path.join(__dirname, "gdbstub-ws-reject"));
    const mainPath = wsFile(workspacePath, "main", "CMakeLists.txt");
    const manifestPath = wsFile(workspacePath, "main", "idf_component.yml");
    const sdkconfigPath = wsFile(workspacePath, "sdkconfig");
    const {
      io,
      files,
      getEditorSetCalls,
      getEditorCloseCalls,
      getReconfigureCalls,
    } = createTestIo({
      files: {
        [mainPath]: "idf_component_register(SRCS main.c)",
        [manifestPath]:
          "dependencies:\n  esp_gdbstub:\n    require: private\n",
        [sdkconfigPath]: "# CONFIG_ESP_SYSTEM_GDBSTUB_RUNTIME is not set\n",
      },
      editorRunning: true,
      setInEditor: async () => {
        throw new Error("not visible");
      },
    });

    const result = await configureProjectForRuntimeGdbStub(workspacePath, io);

    assert.strictEqual(result, "updated");
    assert.strictEqual(getEditorSetCalls(), 1);
    assert.strictEqual(getEditorCloseCalls(), 1);
    assert.strictEqual(getReconfigureCalls(), 1);
    assert.ok(
      files[sdkconfigPath].includes("CONFIG_ESP_SYSTEM_GDBSTUB_RUNTIME=y")
    );
  });

  test("skips a malformed CMakeLists.txt while scanning", async () => {
    const workspacePath = Uri.file(path.join(__dirname, "gdbstub-ws-bad"));
    const goodPath = wsFile(
      workspacePath,
      "components",
      "app",
      "CMakeLists.txt"
    );
    const badPath = wsFile(
      workspacePath,
      "components",
      "broken",
      "CMakeLists.txt"
    );
    const { io, files } = createTestIo({
      files: {
        [badPath]: "idf_component_register(SRCS broken.c",
        [goodPath]: "idf_component_register(SRCS app.c)",
      },
    });

    const result = await configureProjectForRuntimeGdbStub(workspacePath, io);

    const manifestPath = wsFile(
      workspacePath,
      "components",
      "app",
      "idf_component.yml"
    );
    assert.strictEqual(result, "updated");
    assert.strictEqual(files[goodPath], "idf_component_register(SRCS app.c)");
    assert.match(files[manifestPath], /require: private/);
    assert.strictEqual(files[badPath], "idf_component_register(SRCS broken.c");
  });
});

suite("GDB Stub UART debug configuration", () => {
  const emptyLaunch = {};

  test("uses UART GDB Stub for an empty gdbtarget attach when flash type is UART and runtime is enabled", () => {
    assert.strictEqual(
      shouldUseRuntimeGdbStub(emptyLaunch, {
        flashType: "UART",
        runtimeEnabled: true,
      }),
      true
    );
  });

  test("does not override JTAG debug when flash type is JTAG", () => {
    assert.strictEqual(
      shouldUseRuntimeGdbStub(emptyLaunch, {
        flashType: "JTAG",
        runtimeEnabled: true,
      }),
      false
    );
  });

  test("uses GDB Stub when flash type is unset and runtime is enabled", () => {
    assert.strictEqual(
      shouldUseRuntimeGdbStub(emptyLaunch, {
        flashType: "",
        runtimeEnabled: true,
      }),
      true
    );
  });

  test("does not override UART flash when runtime GDB Stub is not enabled", () => {
    assert.strictEqual(
      shouldUseRuntimeGdbStub(emptyLaunch, {
        flashType: "UART",
        runtimeEnabled: false,
      }),
      false
    );
  });

  test("treats the default OpenOCD target as eligible for UART GDB Stub", () => {
    assert.strictEqual(
      shouldUseRuntimeGdbStub(
        {
          target: {
            connectCommands: [
              "set remotetimeout 20",
              "-target-select extended-remote localhost:3333",
            ],
          },
          runOpenOCD: true,
        },
        { flashType: "UART", runtimeEnabled: true }
      ),
      true
    );
  });

  test("does not override an explicit non-default target", () => {
    assert.strictEqual(
      shouldUseRuntimeGdbStub(
        { target: { connectCommands: ["target remote localhost:3333"] } },
        { flashType: "UART", runtimeEnabled: true }
      ),
      false
    );
  });

  test("honors an explicit runtime GDB Stub session id", () => {
    assert.strictEqual(
      shouldUseRuntimeGdbStub(
        { sessionID: RUNTIME_GDBSTUB_SESSION_ID },
        { flashType: "JTAG", runtimeEnabled: false }
      ),
      true
    );
  });

  test("maps platform-specific serial ports for GDB", () => {
    assert.strictEqual(toGdbSerialPort("COM3", "win32"), "\\\\.\\COM3");
    assert.strictEqual(toGdbSerialPort("COM10", "win32"), "\\\\.\\COM10");
    assert.strictEqual(
      toGdbSerialPort("/dev/tty.usbserial-3140", "darwin"),
      "/dev/cu.usbserial-3140"
    );
    assert.strictEqual(
      toGdbSerialPort("/dev/ttyUSB0", "linux"),
      "/dev/ttyUSB0"
    );
    assert.strictEqual(toGdbSerialPort("COM3", "linux"), "COM3");
  });

  test("strips the Windows device prefix before opening the serial port", () => {
    assert.strictEqual(toNodeSerialPortPath("\\\\.\\COM4"), "COM4");
    assert.strictEqual(toNodeSerialPortPath("\\\\.\\COM10"), "COM10");
    assert.strictEqual(toNodeSerialPortPath("COM4"), "COM4");
    assert.strictEqual(toNodeSerialPortPath("/dev/ttyUSB0"), "/dev/ttyUSB0");
  });

  test("applies UART attach commands without OpenOCD", () => {
    const config: RuntimeGdbStubLaunchConfig = {};
    applyRuntimeGdbStubDebugConfig(config, {
      port: "COM3",
      baudRate: 115200,
      hardwareWatchpointLimit: 2,
      platform: "win32",
    });
    assert.strictEqual(config.sessionID, RUNTIME_GDBSTUB_SESSION_ID);
    assert.strictEqual(config.runOpenOCD, false);
    assert.strictEqual(config.hardwareBreakpoint, false);
    assert.deepStrictEqual(config.initCommands, [
      "set remote hardware-watchpoint-limit 2",
      "set backtrace limit 16",
    ]);
    assert.deepStrictEqual(config.gdbStubUart, {
      port: "\\\\.\\COM3",
      baudRate: 115200,
    });
    assert.deepStrictEqual(config.target?.connectCommands, [
      "set remotetimeout 20",
      "set serial baud 115200",
      "target remote \\\\.\\COM3",
    ]);
  });

  test("omits hardware limit commands when sdkconfig has no values", () => {
    const config: RuntimeGdbStubLaunchConfig = {};
    applyRuntimeGdbStubDebugConfig(config, {
      port: "/dev/ttyUSB0",
      baudRate: 115200,
      platform: "linux",
    });
    assert.deepStrictEqual(config.initCommands, ["set backtrace limit 16"]);
  });

  test("uses the macOS callout device for the interrupt and GDB", () => {
    const config: RuntimeGdbStubLaunchConfig = {};
    applyRuntimeGdbStubDebugConfig(config, {
      port: "/dev/tty.usbserial-3140",
      baudRate: 115200,
      platform: "darwin",
    });
    assert.deepStrictEqual(config.gdbStubUart, {
      port: "/dev/cu.usbserial-3140",
      baudRate: 115200,
    });
    assert.ok(
      config.target?.connectCommands?.includes(
        "target remote /dev/cu.usbserial-3140"
      )
    );
  });

  test("parses hardware debug limits from sdkconfig values", () => {
    assert.strictEqual(parseHardwareDebugLimit("2"), 2);
    assert.strictEqual(parseHardwareDebugLimit("4\r"), 4);
    assert.strictEqual(parseHardwareDebugLimit(""), undefined);
    assert.strictEqual(parseHardwareDebugLimit(undefined), undefined);
    assert.strictEqual(parseHardwareDebugLimit("0"), undefined);
  });

  test("parses monitor baud rate with a 115200 fallback", () => {
    assert.strictEqual(parseMonitorBaudRate("74880"), 74880);
    assert.strictEqual(parseMonitorBaudRate(""), 115200);
    assert.strictEqual(parseMonitorBaudRate(undefined), 115200);
  });

  test("treats CRLF sdkconfig values as enabled", () => {
    assert.strictEqual(isSdkconfigOptionEnabled("y"), true);
    assert.strictEqual(isSdkconfigOptionEnabled("y\r"), true);
    assert.strictEqual(isSdkconfigOptionEnabled("n"), false);
  });

  test("inserts the Runtime GDB Stub launch configuration first", () => {
    const { configurations, changed } = mergeRuntimeGdbStubLaunchConfigurations(
      [
        {
          name: "Eclipse CDT GDB Adapter",
          type: "gdbtarget",
          request: "attach",
        },
      ]
    );
    assert.strictEqual(changed, true);
    assert.strictEqual(configurations.length, 2);
    assert.strictEqual(configurations[0].name, RUNTIME_GDBSTUB_LAUNCH_NAME);
    assert.strictEqual(configurations[0].sessionID, RUNTIME_GDBSTUB_SESSION_ID);
    assert.strictEqual(configurations[0].runOpenOCD, false);
    assert.strictEqual(configurations[1].name, "Eclipse CDT GDB Adapter");
  });

  test("does not duplicate an existing Runtime GDB Stub launch configuration", () => {
    const existing = {
      name: RUNTIME_GDBSTUB_LAUNCH_NAME,
      type: "gdbtarget",
      request: "attach",
      sessionID: RUNTIME_GDBSTUB_SESSION_ID,
      runOpenOCD: false,
    };
    const { configurations, changed } = mergeRuntimeGdbStubLaunchConfigurations([
      existing,
    ]);
    assert.strictEqual(changed, false);
    assert.strictEqual(configurations.length, 1);
    assert.strictEqual(configurations[0].sessionID, RUNTIME_GDBSTUB_SESSION_ID);
  });

  test("rejects a runtime session when CONFIG_ESP_SYSTEM_GDBSTUB_RUNTIME is off", () => {
    assert.strictEqual(
      isRuntimeGdbStubFirmwareMissing(RUNTIME_GDBSTUB_SESSION_ID, false),
      true
    );
    const descriptor = getErrorDescriptor(ErrorCode.RuntimeGdbStubNotEnabled);
    assert.ok(descriptor);
    assert.match(
      descriptor.userMessage,
      /ESP-IDF: Configure Project for Runtime GDB Stub/
    );
    assert.match(descriptor.userMessage, /build and flash/);
    assert.ok(
      descriptor.actions.some((action) => action.label === "Configure Project")
    );
    const openOcdDescriptor = getErrorDescriptor(
      ErrorCode.OpenOcdBlocksUartGdbStub
    );
    assert.ok(openOcdDescriptor);
    assert.ok(
      openOcdDescriptor.actions.some((action) => action.label === "Stop OpenOCD")
    );
    assert.deepStrictEqual(
      getErrorDescriptor(ErrorCode.NoPortSelected)?.actions,
      []
    );
  });

  test("prepends gdbinit sources to UART connect commands", () => {
    const symbols = "source /tmp/gdbinit/symbols";
    const prefixMap = "source /tmp/gdbinit/prefix_map";
    const pyExtensions = "source /tmp/gdbinit/py_extensions";
    const merged = mergeGdbinitSourceCommands(
      [
        "set remotetimeout 20",
        "set serial baud 115200",
        "target remote /dev/cu.usbserial-13501",
      ],
      [symbols, prefixMap, pyExtensions]
    );
    assert.deepStrictEqual(merged.slice(0, 3), [
      symbols,
      prefixMap,
      pyExtensions,
    ]);
    assert.deepStrictEqual(merged.slice(3), [
      "set remotetimeout 20",
      "set serial baud 115200",
      "target remote /dev/cu.usbserial-13501",
    ]);
    assert.ok(!merged.some((command) => command.includes("target remote :3333")));
    assert.ok(!merged.some((command) => command.includes("thbreak app_main")));
  });

  test("allows a runtime session when CONFIG_ESP_SYSTEM_GDBSTUB_RUNTIME is on", () => {
    assert.strictEqual(
      isRuntimeGdbStubFirmwareMissing(RUNTIME_GDBSTUB_SESSION_ID, true),
      false
    );
  });

  test("does not apply the runtime firmware check to other sessions", () => {
    assert.strictEqual(isRuntimeGdbStubFirmwareMissing(undefined, false), false);
    assert.strictEqual(
      isRuntimeGdbStubFirmwareMissing("gdbstub.debug.session.ws", false),
      false
    );
  });
});

class FakeUart implements GdbStubByteSource {
  private listener?: (chunk: Buffer) => void;

  on(_event: "data", listener: (chunk: Buffer) => void): void {
    this.listener = listener;
  }

  off(_event: "data", listener: (chunk: Buffer) => void): void {
    if (this.listener === listener) {
      this.listener = undefined;
    }
  }

  emit(chunk: Buffer): void {
    this.listener?.(chunk);
  }
}

suite("GDB Stub stop packet", () => {
  // T05 checksum is 0x54 + 0x30 + 0x35 = 0xb9, the SIGTRAP packet IDF Monitor accepts.
  const stopPacket = Buffer.from("$T05#b9");

  test("accepts a checksum-valid stop packet", () => {
    assert.strictEqual(
      bufferHasGdbStubStopPacket(Buffer.from("boot log\r\n$T05#b9")),
      true
    );
  });

  test("rejects console text and a bad checksum", () => {
    assert.strictEqual(
      bufferHasGdbStubStopPacket(Buffer.from("I (100) app: hello\r\n")),
      false
    );
    assert.strictEqual(bufferHasGdbStubStopPacket(Buffer.from("$T05#00")), false);
  });

  test("reads a stop packet from the UART", async () => {
    const uart = new FakeUart();
    const entered = await readGdbStubStopPacket(uart, {
      timeoutMs: 50,
      attempts: 1,
      sendInterrupt: async () => {
        uart.emit(Buffer.from("ready\r\n"));
        uart.emit(stopPacket);
      },
    });
    assert.strictEqual(entered, true);
  });

  test("rejects a console that never sends a stop packet", async () => {
    const uart = new FakeUart();
    let interrupts = 0;
    const entered = await readGdbStubStopPacket(uart, {
      timeoutMs: 10,
      attempts: 2,
      sendInterrupt: async () => {
        interrupts += 1;
        uart.emit(Buffer.from("I (200) app: still running\r\n"));
      },
    });
    assert.strictEqual(entered, false);
    assert.strictEqual(interrupts, 2);
  });

  test("retries the interrupt until the stop packet arrives", async () => {
    const uart = new FakeUart();
    let interrupts = 0;
    const entered = await readGdbStubStopPacket(uart, {
      timeoutMs: 10,
      attempts: 3,
      sendInterrupt: async () => {
        interrupts += 1;
        if (interrupts === 3) {
          uart.emit(Buffer.from("$T0"));
          uart.emit(Buffer.from("5#b9"));
        }
      },
    });
    assert.strictEqual(entered, true);
    assert.strictEqual(interrupts, 3);
  });
});
