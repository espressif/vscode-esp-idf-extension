/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import * as assert from "assert";
import { join } from "path";
import {
  buildIdfMonitorMakeArgUnquoted,
  buildIdfMonitorQuotedInvokeTokens,
  buildIdfMonitorTerminalSendSequence,
  buildIdfMonitorUnquotedArgv,
  monitorShellKindFromUserShell,
  quotePathForShell,
  resolveMonitorBaudRate,
} from "../../espIdf/monitor/argsBuilder";

const baseUnquotedInput = {
  port: "COM1",
  baudRate: "115200",
  pythonBinPath: "/venv/bin/python",
  idfMonitorToolPath: "/idf/tools/idf_monitor.py",
  idfTarget: "esp32",
  idfVersion: "5.2",
  noReset: false,
  enableTimestamps: false,
  customTimestampFormat: "",
  toolchainPrefix: "xtensa-esp32-elf-",
  elfFilePath: "/proj/build/app.elf",
  idfPath: "/idf",
  isDebugSessionActive: false,
};

suite("Monitor argsBuilder", () => {
  suite("quotePathForShell", () => {
    test("powershell escapes single quotes", () => {
      assert.strictEqual(
        quotePathForShell("/a/b'c", "powershell"),
        "'/a/b''c'"
      );
    });
    test("cmd uses double quotes", () => {
      assert.strictEqual(quotePathForShell(`C:\\a b\\c`, "cmd"), `"C:\\a b\\c"`);
    });
    test("posix wraps in single quotes", () => {
      assert.strictEqual(quotePathForShell("/a/b", "posix"), "'/a/b'");
    });
  });

  suite("monitorShellKindFromUserShell", () => {
    test("maps known shells", () => {
      assert.strictEqual(monitorShellKindFromUserShell("powershell"), "powershell");
      assert.strictEqual(monitorShellKindFromUserShell("pwsh"), "pwsh");
      assert.strictEqual(monitorShellKindFromUserShell("cmd"), "cmd");
      assert.strictEqual(monitorShellKindFromUserShell("bash"), "posix");
      assert.strictEqual(monitorShellKindFromUserShell(null), "posix");
    });
  });

  suite("resolveMonitorBaudRate", () => {
    test("prefers config then env fallbacks then default", () => {
      assert.strictEqual(resolveMonitorBaudRate("", "", ""), "115200");
      assert.strictEqual(resolveMonitorBaudRate("921600", "", ""), "921600");
      assert.strictEqual(resolveMonitorBaudRate("", "230400", ""), "230400");
      assert.strictEqual(resolveMonitorBaudRate("", "", "460800"), "460800");
    });
  });

  suite("buildIdfMonitorMakeArgUnquoted", () => {
    test("joins python and idf.py", () => {
      const make = buildIdfMonitorMakeArgUnquoted("/py", "/idf");
      assert.strictEqual(make, `/py ${join("/idf", "tools", "idf.py")}`);
    });
  });

  suite("buildIdfMonitorUnquotedArgv", () => {
    test("places --no-reset after python and script when debug active", () => {
      const argv = buildIdfMonitorUnquotedArgv({
        ...baseUnquotedInput,
        isDebugSessionActive: true,
      });
      assert.strictEqual(argv[0], baseUnquotedInput.pythonBinPath);
      assert.strictEqual(argv[1], baseUnquotedInput.idfMonitorToolPath);
      assert.strictEqual(argv[2], "--no-reset");
      assert.strictEqual(argv[3], "-p");
    });

    test("inserts --no-reset for noReset on IDF 5.x", () => {
      const argv = buildIdfMonitorUnquotedArgv({
        ...baseUnquotedInput,
        noReset: true,
        idfVersion: "5.0",
      });
      assert.ok(argv.includes("--no-reset"));
    });

    test("omits --no-reset for noReset on IDF 4.x", () => {
      const argv = buildIdfMonitorUnquotedArgv({
        ...baseUnquotedInput,
        noReset: true,
        idfVersion: "4.4",
      });
      assert.ok(!argv.includes("--no-reset"));
    });

    test("adds --target from 4.3", () => {
      const argv = buildIdfMonitorUnquotedArgv({
        ...baseUnquotedInput,
        idfVersion: "4.3",
      });
      const i = argv.indexOf("--target");
      assert.ok(i !== -1);
      assert.strictEqual(argv[i + 1], "esp32");
    });

    test("omits --target below 4.3", () => {
      const argv = buildIdfMonitorUnquotedArgv({
        ...baseUnquotedInput,
        idfVersion: "4.2",
      });
      assert.ok(!argv.includes("--target"));
    });

    test("adds timestamps from 4.4", () => {
      const argv = buildIdfMonitorUnquotedArgv({
        ...baseUnquotedInput,
        idfVersion: "4.4",
        enableTimestamps: true,
      });
      assert.ok(argv.includes("--timestamps"));
    });

    test("adds timestamp format when set and version ok", () => {
      const argv = buildIdfMonitorUnquotedArgv({
        ...baseUnquotedInput,
        idfVersion: "4.4",
        customTimestampFormat: "%H:%M",
      });
      const i = argv.indexOf("--timestamp-format");
      assert.ok(i !== -1);
      assert.strictEqual(argv[i + 1], JSON.stringify("%H:%M"));
    });

    test("adds --ws when wsPort is set", () => {
      const argv = buildIdfMonitorUnquotedArgv({
        ...baseUnquotedInput,
        wsPort: 8080,
      });
      const i = argv.indexOf("--ws");
      assert.ok(i !== -1);
      assert.strictEqual(argv[i + 1], "ws://localhost:8080");
    });

    test("ends with elf path", () => {
      const argv = buildIdfMonitorUnquotedArgv(baseUnquotedInput);
      assert.strictEqual(argv[argv.length - 1], baseUnquotedInput.elfFilePath);
    });

    test("includes --make with unquoted flash helper", () => {
      const argv = buildIdfMonitorUnquotedArgv(baseUnquotedInput);
      const i = argv.indexOf("--make");
      assert.ok(i !== -1);
      assert.strictEqual(
        argv[i + 1],
        buildIdfMonitorMakeArgUnquoted(
          baseUnquotedInput.pythonBinPath,
          baseUnquotedInput.idfPath
        )
      );
    });
  });

  suite("buildIdfMonitorQuotedInvokeTokens", () => {
    test("quotes paths for posix shell", () => {
      const tokens = buildIdfMonitorQuotedInvokeTokens({
        ...baseUnquotedInput,
        shellKind: "posix",
      });
      assert.strictEqual(tokens[0], quotePathForShell("/venv/bin/python", "posix"));
      assert.ok(tokens.join(" ").includes("-p COM1"));
    });
  });

  suite("buildIdfMonitorTerminalSendSequence", () => {
    test("powershell uses two lines and delay", () => {
      const seq = buildIdfMonitorTerminalSendSequence({
        shellKind: "powershell",
        modifiedEnvIdfPath: "/idf",
        quotedInvokeJoined: "python monitor.py",
      });
      assert.strictEqual(seq.texts.length, 2);
      assert.ok(seq.texts[0].includes("$env:IDF_PATH"));
      assert.ok(seq.texts[1].startsWith(" & "));
      assert.strictEqual(seq.delayMsAfterFirstLine, 1000);
    });

    test("cmd uses set or export based on platform", () => {
      const seq = buildIdfMonitorTerminalSendSequence({
        shellKind: "cmd",
        modifiedEnvIdfPath: "C:\\idf",
        quotedInvokeJoined: "run",
      });
      const envSet = process.platform === "win32" ? "set" : "export";
      assert.strictEqual(seq.texts[0], `${envSet} IDF_PATH=C:\\idf`);
      assert.strictEqual(seq.texts[1], "run");
    });

    test("posix uses export and quoted path", () => {
      const seq = buildIdfMonitorTerminalSendSequence({
        shellKind: "posix",
        modifiedEnvIdfPath: "/esp/idf",
        quotedInvokeJoined: "cmdline",
      });
      assert.strictEqual(
        seq.texts[0],
        `export IDF_PATH=${quotePathForShell("/esp/idf", "posix")}`
      );
    });
  });
});
