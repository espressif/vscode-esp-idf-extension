/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 26th November 2026
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { expect } from "chai";
import { resolve } from "path";
import { DebugToolbar } from "vscode-extension-tester";
import {
  ESP_IDF_COMMANDS,
  executeEspIdfCommand,
  executeEspIdfCommandAndSelectOption,
  gdbStubWorkspaceDir,
  openWorkspaceFolder,
  readCurrentTerminalText,
  selectFromCurrentPicker,
  releaseSerialMonitor,
  testHardwareSerialPort,
  waitForBuildComplete,
  waitForCallStackMatching,
  waitForOutputChannelText,
  waitForPathAbsent,
  waitForTerminalOutput,
  waitUntilDebugPaused,
} from "./ui-test-helpers";

const LAUNCH_GDB_STUB_MONITOR =
  "ESP-IDF: Launch IDF Monitor for Core Dump Mode/GDB Stub Mode";

const SET_TARGET_COMPLETE_PATTERN =
  /Target .* Set Successfully|idf\.py set-target.*done|Project targets have been set/i;

const FLASH_SUCCESS_PATTERN =
  /Hash of data verified|Flash Done|Hard resetting via RTS pin/;

const PANIC_PATTERN = /Entering gdb stub|Guru Meditation Error|abort\(\) was called/i;

const PANIC_STACK_PATTERN = /abort|app_main|panic/i;

const failureHint = {
  setTarget:
    "Set-target opens the chip picker, then the board picker, and writes sdkconfig from sdkconfig.defaults. A miss here is a picker label or the ESP-IDF output channel never reporting completion. CONFIG_ESP_SYSTEM_PANIC_GDBSTUB is applied only when this command generates sdkconfig.",
  build:
    "Full clean must delete build/gdb-stub.bin before the build. The binary name comes from project(gdb-stub). A missing bin after a clean-looking build means the workspace folder or the project name is wrong.",
  selectPort:
    "The port is IDF_UI_TEST_SERIAL_PORT, default /dev/ttyUSB1. If that label is not in the picker, another process still holds the UART, or the port is not present on the runner.",
  selectUart:
    "Flash method has to be UART. JTAG flash does not toggle EN, so it will not replace firmware that is sitting in the GDB stub.",
  flash:
    "Success text is Hash of data verified, Flash Done, or Hard resetting via RTS pin. Port busy means idf_monitor or gdb still has the UART open.",
  launchMonitor:
    "The palette label must match package.nls.json exactly. This command starts the websocket monitor. It does not start a debug session by itself.",
  panic:
    "Expected monitor text is Entering gdb stub, Guru Meditation Error, or abort() was called. A reboot loop means sdkconfig was generated without CONFIG_ESP_SYSTEM_PANIC_GDBSTUB.",
  debugSession:
    "After the monitor reports gdb_stub the extension must open GDB Stub Debug on its own, with no second F5. No toolbar means that launch did not happen, or opening this folder reloaded the window and dropped the test driver. A toolbar that never pauses means the session started and did not halt.",
  callStack:
    "Any frame containing abort, app_main, or panic is enough. A ROM-only stack without those words is a pattern miss on a session that did start.",
  stop:
    "Stop must hide the debug toolbar and release the UART. The chip is left in the stub on purpose. The next hello_world UART flash is what leaves panic mode.",
} as const;

const gdbStubBinPath = resolve(gdbStubWorkspaceDir, "build", "gdb-stub.bin");

const state = {
  flashed: false,
};

let skipRemainingSteps = false;

function scenario(title: string, defineSteps: () => void): void {
  describe(title, function () {
    before(function () {
      skipRemainingSteps = false;
    });
    defineSteps();
  });
}

function step(
  stepName: string,
  action: () => Promise<void>,
  hint: string
): void {
  it(stepName, async function () {
    this.timeout(999999);
    if (skipRemainingSteps) {
      this.skip();
    }
    console.log(`  → [step] ${stepName}`);
    try {
      await action();
      console.log(`  ✓ [step] ${stepName}`);
    } catch (err) {
      skipRemainingSteps = true;
      const orig = err instanceof Error ? err.message : String(err);
      const message = `Test failed at: ${stepName}\n${orig}\n${hint}`;
      console.log(`  ✗ [step] ${message}`);
      throw new Error(message);
    }
  });
}

async function terminalTail(): Promise<string> {
  try {
    const text = await readCurrentTerminalText();
    const max = 4000;
    return text.length <= max ? text : text.slice(text.length - max);
  } catch (err) {
    return `(terminal unreadable: ${
      err instanceof Error ? err.message : String(err)
    })`;
  }
}

describe("Hardware E2E: GDB Stub after panic", () => {
  before(async function () {
    this.timeout(120000);
    try {
      await releaseSerialMonitor();
      await openWorkspaceFolder(gdbStubWorkspaceDir);
    } catch (err) {
      const orig = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Could not open ${gdbStubWorkspaceDir} before the gdb-stub scenarios. ` +
          `Opening a second folder reloads the window and can drop the test driver.\n${orig}`
      );
    }
  });

  after(async function () {
    this.timeout(60000);
    await releaseSerialMonitor();
  });

  scenario("builds and flashes the gdb stub project", () => {
    step("Set target esp32 and board ESP32-ETHERNET-KIT", async () => {
      await executeEspIdfCommand(ESP_IDF_COMMANDS.setTarget);
      await new Promise((res) => setTimeout(res, 1000));
      await selectFromCurrentPicker("esp32", 15000);
      await new Promise((res) => setTimeout(res, 1000));
      await selectFromCurrentPicker("ESP32-ETHERNET-KIT", 15000);
      await waitForOutputChannelText(
        "ESP-IDF",
        SET_TARGET_COMPLETE_PATTERN,
        120000
      );
    }, failureHint.setTarget);

    step("Build project", async () => {
      await executeEspIdfCommand(ESP_IDF_COMMANDS.fullClean);
      await waitForPathAbsent(gdbStubBinPath, 60000);
      await executeEspIdfCommand(ESP_IDF_COMMANDS.build);
      const buildOutput = await waitForBuildComplete(gdbStubBinPath, 300000);
      console.log(buildOutput);
    }, failureHint.build);

    step(`Select serial port ${testHardwareSerialPort}`, async () => {
      await executeEspIdfCommandAndSelectOption(
        ESP_IDF_COMMANDS.selectPort,
        testHardwareSerialPort
      );
    }, failureHint.selectPort);

    step("Select UART flash method", async () => {
      await executeEspIdfCommandAndSelectOption(
        ESP_IDF_COMMANDS.selectFlashMethod,
        "UART"
      );
    }, failureHint.selectUart);

    step("Flash project and verify success", async () => {
      await executeEspIdfCommand(ESP_IDF_COMMANDS.flash);
      const flashOutput = await waitForTerminalOutput(
        FLASH_SUCCESS_PATTERN,
        180000
      );
      expect(FLASH_SUCCESS_PATTERN.test(flashOutput)).to.be.true;
      state.flashed = true;
    }, failureHint.flash);
  });

  scenario("opens a GDB Stub debug session from the monitor", () => {
    before(function () {
      if (!state.flashed) {
        this.skip();
      }
    });

    step("Launch the GDB Stub monitor", async () => {
      await executeEspIdfCommand(LAUNCH_GDB_STUB_MONITOR);
    }, failureHint.launchMonitor);

    step("Wait until the monitor reports the panic", async () => {
      const monitorOutput = await waitForTerminalOutput(PANIC_PATTERN, 120000);
      console.log(monitorOutput);
    }, failureHint.panic);

    step("Debug session starts without a second launch", async () => {
      try {
        await DebugToolbar.create(120000);
        await waitUntilDebugPaused(120000);
      } catch (err) {
        const orig = err instanceof Error ? err.message : String(err);
        throw new Error(
          `${orig}\nMonitor terminal at failure:\n${await terminalTail()}`
        );
      }
    }, failureHint.debugSession);

    step("Call stack contains the panic site", async () => {
      const callStack = await waitForCallStackMatching(
        PANIC_STACK_PATTERN,
        30000
      );
      console.log(callStack);
    }, failureHint.callStack);

    step("Stop closes the debug session", async () => {
      await releaseSerialMonitor();
      let toolbarVisible = true;
      try {
        await DebugToolbar.create(3000);
      } catch {
        toolbarVisible = false;
      }
      if (toolbarVisible) {
        throw new Error(
          `Debug toolbar still visible after Stop.\nMonitor terminal at failure:\n${await terminalTail()}`
        );
      }
    }, failureHint.stop);
  });
});
