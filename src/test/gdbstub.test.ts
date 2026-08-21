import * as assert from "assert";
import * as path from "path";
import { Uri } from "vscode";
import {
  addPrivateRequirement,
  enableSdkconfigOption,
  hasIdfComponentRegister,
} from "../espIdf/gdbstub/configurationText";
import {
  configureProjectForRuntimeGdbStub,
  GdbStubProjectIo,
} from "../espIdf/gdbstub/configureProject";
import {
  RUNTIME_GDBSTUB_LAUNCH_NAME,
  RUNTIME_GDBSTUB_SESSION_ID,
  RuntimeGdbStubLaunchConfig,
  applyRuntimeGdbStubDebugConfig,
  isSdkconfigOptionEnabled,
  mergeRuntimeGdbStubLaunchConfigurations,
  parseMonitorBaudRate,
  shouldUseRuntimeGdbStub,
  toGdbSerialPort,
} from "../espIdf/gdbstub/debugConfig";

const requirement = "esp_gdbstub";
const option = "CONFIG_ESP_SYSTEM_GDBSTUB_RUNTIME";

suite("GDB Stub project configuration", () => {
  const cmakeCases: { name: string; input: string; expected: string }[] = [
    {
      name: "adds esp_gdbstub to existing private requirements",
      input: [
        'idf_component_register(SRCS "hello_world_main.c"',
        "                       PRIV_REQUIRES spi_flash",
        '                       INCLUDE_DIRS "")',
      ].join("\n"),
      expected: [
        'idf_component_register(SRCS "hello_world_main.c"',
        "                       PRIV_REQUIRES spi_flash esp_gdbstub",
        '                       INCLUDE_DIRS "")',
      ].join("\n"),
    },
    {
      name: "creates private requirements when missing",
      input: [
        'idf_component_register(SRCS "hello_world_main.c"',
        '                       INCLUDE_DIRS "")',
      ].join("\n"),
      expected: [
        'idf_component_register(SRCS "hello_world_main.c"',
        '                       INCLUDE_DIRS ""',
        "                       PRIV_REQUIRES esp_gdbstub)",
      ].join("\n"),
    },
    {
      name: "does not add an existing private requirement twice",
      input: "idf_component_register(SRCS main.c PRIV_REQUIRES esp_gdbstub)",
      expected: "idf_component_register(SRCS main.c PRIV_REQUIRES esp_gdbstub)",
    },
    {
      name: "does not add PRIV_REQUIRES when already in REQUIRES",
      input: "idf_component_register(SRCS main.c REQUIRES esp_gdbstub)",
      expected: "idf_component_register(SRCS main.c REQUIRES esp_gdbstub)",
    },
    {
      name: "treats a quoted private requirement as already present",
      input: 'idf_component_register(SRCS main.c PRIV_REQUIRES "esp_gdbstub")',
      expected:
        'idf_component_register(SRCS main.c PRIV_REQUIRES "esp_gdbstub")',
    },
    {
      name: "preserves a closing parenthesis on its own line",
      input: ["idf_component_register(", "  SRCS main.c", ")"].join("\n"),
      expected: [
        "idf_component_register(",
        "  SRCS main.c",
        "  PRIV_REQUIRES esp_gdbstub",
        ")",
      ].join("\n"),
    },
    {
      name: "does not treat a source filename as an existing requirement",
      input: 'idf_component_register(SRCS "esp_gdbstub.c")',
      expected:
        'idf_component_register(SRCS "esp_gdbstub.c" PRIV_REQUIRES esp_gdbstub)',
    },
    {
      name: "does not rewrite PRIV_REQUIRES inside a source filename",
      input: 'idf_component_register(SRCS "file_with_PRIV_REQUIRES_in_name.c")',
      expected:
        'idf_component_register(SRCS "file_with_PRIV_REQUIRES_in_name.c" PRIV_REQUIRES esp_gdbstub)',
    },
    {
      name: "ignores a commented register and edits the real call",
      input: [
        "# idf_component_register(SRCS dummy.c)",
        "idf_component_register(SRCS main.c)",
      ].join("\n"),
      expected: [
        "# idf_component_register(SRCS dummy.c)",
        "idf_component_register(SRCS main.c PRIV_REQUIRES esp_gdbstub)",
      ].join("\n"),
    },
    {
      name: "does not insert into a commented PRIV_REQUIRES",
      input: [
        "idf_component_register(",
        "  SRCS main.c",
        "  # PRIV_REQUIRES spi_flash",
        ")",
      ].join("\n"),
      expected: [
        "idf_component_register(",
        "  SRCS main.c",
        "  # PRIV_REQUIRES spi_flash",
        "  PRIV_REQUIRES esp_gdbstub",
        ")",
      ].join("\n"),
    },
    {
      name: "does not close the command on a quoted parenthesis",
      input: 'idf_component_register(SRCS ")")',
      expected: 'idf_component_register(SRCS ")" PRIV_REQUIRES esp_gdbstub)',
    },
    {
      name: "preserves CRLF when adding PRIV_REQUIRES",
      input: ["idf_component_register(", "  SRCS main.c", ")"].join("\r\n"),
      expected: [
        "idf_component_register(",
        "  SRCS main.c",
        "  PRIV_REQUIRES esp_gdbstub",
        ")",
      ].join("\r\n"),
    },
  ];

  for (const cmakeCase of cmakeCases) {
    test(cmakeCase.name, () => {
      const result = addPrivateRequirement(cmakeCase.input, requirement);
      assert.strictEqual(result, cmakeCase.expected);
      assert.strictEqual(
        addPrivateRequirement(result, requirement),
        result,
        "addPrivateRequirement should be idempotent"
      );
    });
  }

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

  test("addPrivateRequirement throws when the command is missing", () => {
    assert.throws(() =>
      addPrivateRequirement("project(hello_world)", requirement)
    );
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
    };
    return {
      io,
      files,
      writes,
      getEditorSetCalls: () => editorSetCalls,
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
    const { io, files, writes, getEditorSetCalls } = createTestIo({
      files: {
        [mainPath]: 'idf_component_register(SRCS "main.c")',
        [otherPath]: 'idf_component_register(SRCS "foo.c")',
      },
    });

    const result = await configureProjectForRuntimeGdbStub(workspacePath, io);

    assert.strictEqual(result, "updated");
    assert.ok(files[mainPath].includes("PRIV_REQUIRES esp_gdbstub"));
    assert.ok(!files[otherPath].includes("esp_gdbstub"));
    assert.ok(
      files[sdkconfigPath].includes("CONFIG_ESP_SYSTEM_GDBSTUB_RUNTIME=y")
    );
    assert.deepStrictEqual(writes, [mainPath, sdkconfigPath]);
    assert.strictEqual(getEditorSetCalls(), 0);
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

  test("returns unchanged when CMake and sdkconfig are already configured", async () => {
    const workspacePath = Uri.file(path.join(__dirname, "gdbstub-ws-done"));
    const mainPath = wsFile(workspacePath, "main", "CMakeLists.txt");
    const sdkconfigPath = wsFile(workspacePath, "sdkconfig");
    const { io, writes, getEditorSetCalls } = createTestIo({
      files: {
        [mainPath]:
          "idf_component_register(SRCS main.c PRIV_REQUIRES esp_gdbstub)",
        [sdkconfigPath]: "CONFIG_ESP_SYSTEM_GDBSTUB_RUNTIME=y\n",
      },
    });

    const result = await configureProjectForRuntimeGdbStub(workspacePath, io);

    assert.strictEqual(result, "unchanged");
    assert.deepStrictEqual(writes, []);
    assert.strictEqual(getEditorSetCalls(), 0);
  });

  test("updates CMake without touching sdkconfig when the option is already set", async () => {
    const workspacePath = Uri.file(path.join(__dirname, "gdbstub-ws-cmake"));
    const mainPath = wsFile(workspacePath, "main", "CMakeLists.txt");
    const sdkconfigPath = wsFile(workspacePath, "sdkconfig");
    const { io, files, writes, getEditorSetCalls } = createTestIo({
      files: {
        [mainPath]: "idf_component_register(SRCS main.c)",
        [sdkconfigPath]: "CONFIG_ESP_SYSTEM_GDBSTUB_RUNTIME=y\n",
      },
    });

    const result = await configureProjectForRuntimeGdbStub(workspacePath, io);

    assert.strictEqual(result, "updated");
    assert.ok(files[mainPath].includes("PRIV_REQUIRES esp_gdbstub"));
    assert.deepStrictEqual(writes, [mainPath]);
    assert.strictEqual(getEditorSetCalls(), 0);
  });

  test("writes sdkconfig without rewriting CMake when the requirement exists", async () => {
    const workspacePath = Uri.file(path.join(__dirname, "gdbstub-ws-kconfig"));
    const mainPath = wsFile(workspacePath, "main", "CMakeLists.txt");
    const sdkconfigPath = wsFile(workspacePath, "sdkconfig");
    const { io, files, writes, getEditorSetCalls } = createTestIo({
      files: {
        [mainPath]:
          "idf_component_register(SRCS main.c PRIV_REQUIRES esp_gdbstub)",
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
  });

  test("sets the option through a running SDK Configuration Editor", async () => {
    const workspacePath = Uri.file(path.join(__dirname, "gdbstub-ws-editor"));
    const mainPath = wsFile(workspacePath, "main", "CMakeLists.txt");
    const sdkconfigPath = wsFile(workspacePath, "sdkconfig");
    const { io, files, writes, getEditorSetCalls } = createTestIo({
      files: {
        [mainPath]:
          "idf_component_register(SRCS main.c PRIV_REQUIRES esp_gdbstub)",
        [sdkconfigPath]: "CONFIG_OTHER=y\n",
      },
      editorRunning: true,
    });

    const result = await configureProjectForRuntimeGdbStub(workspacePath, io);

    assert.strictEqual(result, "updated");
    assert.deepStrictEqual(writes, []);
    assert.strictEqual(files[sdkconfigPath], "CONFIG_OTHER=y\n");
    assert.strictEqual(getEditorSetCalls(), 1);
  });

  test("reports that CMake was updated if the running editor cannot set the option", async () => {
    const workspacePath = Uri.file(path.join(__dirname, "gdbstub-ws-fail"));
    const mainPath = wsFile(workspacePath, "main", "CMakeLists.txt");
    const { io, files } = createTestIo({
      files: {
        [mainPath]: "idf_component_register(SRCS main.c)",
      },
      editorRunning: true,
      setInEditor: async () => {
        throw new Error("confserver down");
      },
    });

    await assert.rejects(
      () => configureProjectForRuntimeGdbStub(workspacePath, io),
      /CMakeLists\.txt/
    );
    assert.ok(files[mainPath].includes("PRIV_REQUIRES esp_gdbstub"));
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

    assert.strictEqual(result, "updated");
    assert.ok(files[goodPath].includes("PRIV_REQUIRES esp_gdbstub"));
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

  test("maps Windows COM ports for GDB and leaves other paths unchanged", () => {
    assert.strictEqual(toGdbSerialPort("COM3", "win32"), "\\\\.\\COM3");
    assert.strictEqual(toGdbSerialPort("COM10", "win32"), "\\\\.\\COM10");
    assert.strictEqual(toGdbSerialPort("/dev/ttyUSB0", "linux"), "/dev/ttyUSB0");
    assert.strictEqual(toGdbSerialPort("COM3", "linux"), "COM3");
  });

  test("applies UART attach commands without OpenOCD", () => {
    const config: RuntimeGdbStubLaunchConfig = {};
    applyRuntimeGdbStubDebugConfig(config, {
      port: "COM3",
      baudRate: 115200,
      platform: "win32",
    });
    assert.strictEqual(config.sessionID, RUNTIME_GDBSTUB_SESSION_ID);
    assert.strictEqual(config.runOpenOCD, false);
    assert.strictEqual(config.hardwareBreakpoint, true);
    assert.deepStrictEqual(config.initCommands, [
      "set remote hardware-breakpoint-limit {IDF_TARGET_CPU_WATCHPOINT_NUM}",
      "set remote hardware-watchpoint-limit {IDF_TARGET_CPU_WATCHPOINT_NUM}",
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
});
