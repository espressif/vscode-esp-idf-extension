/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 28th May 2026
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
import {
  BottomBarPanel,
  DebugToolbar,
  EditorView,
  TextEditor,
  Workbench,
} from "vscode-extension-tester";
import {
  ESP_IDF_COMMANDS,
  dismissNotifications,
  executeEspIdfCommand,
  executeEspIdfCommandAndSelectOption,
  helloWorldBinPath,
  killDebugProcesses,
  openTestProject,
  selectFromCurrentPicker,
  setBreakpointInFile,
  testHardwareSerialPort,
  testWorkspaceDir,
  waitForBuildComplete,
  waitForCallStackMatching,
  waitForOutputChannelText,
  waitForPathAbsent,
  waitForPausedAtLine,
  waitForPausedLine,
  waitForTerminalOutput,
} from "./ui-test-helpers";

// ─── patterns ────────────────────────────────────────────────────────────────

const FLASH_SUCCESS_PATTERN =
  /Hash of data verified|Flash Done|Hard resetting via RTS pin/;

const MONITOR_OUTPUT_PATTERN = /UI test monitor output check/;

const SET_TARGET_COMPLETE_PATTERN =
  /Target .* Set Successfully|idf\.py set-target.*done|Project targets have been set/i;

const DEBUG_FATAL_ERROR_PATTERN =
  /Target failure|Error: .*failed to halt|OpenOCD failed|LIBUSB_ERROR|failed to connect/i;

// Default launch injects `thb app_main`, which lands on the prologue or first
// statement (lines 6–8). The user breakpoint is the next volatile assignment
// so Continue cannot be confused with that halt. Step-over target is ESP_LOGI
// (a statement, not a step-into of the log macro).
const USER_BREAKPOINT_LINE = 9;
const STEP_OVER_TARGET_LINE = 10;
const SOURCE_FILE_NAME = "hello_world_main.c";
const SOURCE_FILE_PATH = resolve(testWorkspaceDir, "main", SOURCE_FILE_NAME);
const APP_MAIN_STACK_PATTERN = /app_main/;

// ─── shared state ────────────────────────────────────────────────────────────

const state = {
  buildSucceeded: false,
  flashSucceeded: false,
  monitorSucceeded: false,
  activeDebugToolbar: undefined as DebugToolbar | undefined,
};

// ─── helpers ─────────────────────────────────────────────────────────────────

async function step(
  stepName: string,
  action: () => Promise<void>
): Promise<void> {
  console.log(`  → [step] ${stepName}`);
  try {
    await action();
    console.log(`  ✓ [step] ${stepName}`);
  } catch (err) {
    const orig = err instanceof Error ? err.message : String(err);
    console.log(`  ✗ [step] ${stepName}\n${orig}`);
    throw new Error(`Test failed at: ${stepName}\n${orig}`);
  }
}

async function assertNoOpenOcdFatal(when: string): Promise<void> {
  const openocdLog = await waitForOutputChannelText("ESP-IDF", /.*/, 5000).catch(
    () => ""
  );
  if (DEBUG_FATAL_ERROR_PATTERN.test(openocdLog)) {
    throw new Error(`Fatal OpenOCD error ${when}.\nESP-IDF output:\n${openocdLog}`);
  }
}

/** Stops any active debug session and force-kills OpenOCD / GDB processes. */
async function stopDebugSession(toolbar?: DebugToolbar): Promise<void> {
  if (toolbar) {
    const alive = await toolbar.isDisplayed().catch(() => false);
    if (alive) {
      await toolbar.stop().catch(() => undefined);
      await new Promise((res) => setTimeout(res, 3000));
    }
  }
  await new Workbench()
    .executeCommand("workbench.action.debug.stop")
    .catch(() => undefined);
  await new Promise((res) => setTimeout(res, 2000));
  await killDebugProcesses();
}

// ─── test suite ──────────────────────────────────────────────────────────────

describe("Hardware E2E: build → flash → monitor → debug", () => {
  before(async function () {
    this.timeout(100000);
    await dismissNotifications();
    await openTestProject();
  });

  after(async function () {
    this.timeout(30000);
    console.log("[after] Cleanup: stopping debug session and killing processes");
    await stopDebugSession(state.activeDebugToolbar);
    state.activeDebugToolbar = undefined;
    await new BottomBarPanel().toggle(false).catch(() => undefined);
    console.log("[after] Cleanup complete");
  });

  // ── build ──────────────────────────────────────────────────────────────────

  it("builds testWorkspace", async function () {
    await step("Full clean", async () => {
      await executeEspIdfCommand(ESP_IDF_COMMANDS.fullClean);
      await waitForPathAbsent(helloWorldBinPath, 60000);
    });

    await step("Build project", async () => {
      await executeEspIdfCommand(ESP_IDF_COMMANDS.build);
      const buildOutput = await waitForBuildComplete(helloWorldBinPath, 300000);
      console.log(buildOutput);
    });

    state.buildSucceeded = true;
  }).timeout(999999);

  // ── flash ──────────────────────────────────────────────────────────────────

  it("flashes testWorkspace", async function () {
    if (!state.buildSucceeded) {
      this.skip();
    }

    await step(`Select serial port ${testHardwareSerialPort}`, async () => {
      await executeEspIdfCommandAndSelectOption(
        ESP_IDF_COMMANDS.selectPort,
        testHardwareSerialPort
      );
    });

    await step("Select UART flash method", async () => {
      await executeEspIdfCommandAndSelectOption(
        ESP_IDF_COMMANDS.selectFlashMethod,
        "UART"
      );
    });

    await step("Flash project and verify success", async () => {
      await executeEspIdfCommand(ESP_IDF_COMMANDS.flash);
      const flashOutput = await waitForTerminalOutput(
        FLASH_SUCCESS_PATTERN,
        180000
      );
      console.log(flashOutput);
      expect(FLASH_SUCCESS_PATTERN.test(flashOutput)).to.be.true;
    });

    state.flashSucceeded = true;
  }).timeout(999999);

  // ── monitor ────────────────────────────────────────────────────────────────

  it("shows expected monitor output", async function () {
    if (!state.flashSucceeded) {
      this.skip();
    }

    await step(`Select monitor port ${testHardwareSerialPort}`, async () => {
      await executeEspIdfCommandAndSelectOption(
        ESP_IDF_COMMANDS.selectMonitorPort,
        testHardwareSerialPort
      );
    });

    await step("Start monitor and verify expected output", async () => {
      await executeEspIdfCommand(ESP_IDF_COMMANDS.monitor);
      const monitorOutput = await waitForTerminalOutput(
        MONITOR_OUTPUT_PATTERN,
        120000
      );
      console.log(monitorOutput);
      expect(MONITOR_OUTPUT_PATTERN.test(monitorOutput)).to.be.true;
    });

    await step("Kill monitor terminal", async () => {
      await new Workbench().executeCommand("workbench.action.terminal.kill");
      await new Promise((res) => setTimeout(res, 2000));
    });

    state.monitorSucceeded = true;
  }).timeout(999999);

  // ── debug ──────────────────────────────────────────────────────────────────

  it("debugs testWorkspace via JTAG on ESP32 ETHERNET KIT", async function () {
    if (!state.flashSucceeded || !state.monitorSucceeded) {
      this.skip();
    }

    await dismissNotifications();

    await step("Select JTAG flash method", async () => {
      await executeEspIdfCommandAndSelectOption(
        ESP_IDF_COMMANDS.selectFlashMethod,
        "JTAG"
      );
    });

    await step("Set target esp32 and board ESP32-ETHERNET-KIT", async () => {
      await executeEspIdfCommand(ESP_IDF_COMMANDS.setTarget);
      await new Promise((res) => setTimeout(res, 1000));
      await selectFromCurrentPicker("esp32", 15000);
      await new Promise((res) => setTimeout(res, 1000));
      await selectFromCurrentPicker("ESP32-ETHERNET-KIT", 15000);
    });

    await step("Wait for idf.py set-target to complete", async () => {
      await waitForOutputChannelText(
        "ESP-IDF",
        SET_TARGET_COMPLETE_PATTERN,
        120000
      );
    });

    await step("Rebuild project for the new target", async () => {
      await executeEspIdfCommand(ESP_IDF_COMMANDS.fullClean);
      await waitForPathAbsent(helloWorldBinPath, 60000);
      await executeEspIdfCommand(ESP_IDF_COMMANDS.build);
      await waitForBuildComplete(helloWorldBinPath, 300000);
    });

    let debugToolbar: DebugToolbar;

    await step("Launch debugger", async () => {
      await new Workbench().executeCommand("workbench.action.debug.start");
      debugToolbar = await DebugToolbar.create(60000);
      state.activeDebugToolbar = debugToolbar;
    });

    await step("Wait for default halt at app_main", async () => {
      await debugToolbar!.waitForBreakPoint(60000);
      await assertNoOpenOcdFatal("on attach");

      const haltedLine = await waitForPausedLine(SOURCE_FILE_PATH, 30000);
      expect(
        haltedLine,
        `Default thb app_main should stop before user breakpoint (line ${USER_BREAKPOINT_LINE}), got ${haltedLine}`
      ).to.be.lessThan(USER_BREAKPOINT_LINE);
      expect(haltedLine, `GDB halted at ${haltedLine}, expected app_main`).to.be.at.least(6);

      await waitForCallStackMatching(APP_MAIN_STACK_PATTERN, 15000);
    });

    await step(
      `Set gutter breakpoint at ${SOURCE_FILE_NAME}:${USER_BREAKPOINT_LINE}`,
      async () => {
        await setBreakpointInFile(SOURCE_FILE_PATH, USER_BREAKPOINT_LINE);
        const editor = (await new EditorView().openEditor(
          SOURCE_FILE_NAME
        )) as TextEditor;
        const gutterBp = await editor.getBreakpoint(USER_BREAKPOINT_LINE);
        if (!gutterBp) {
          throw new Error(
            `Gutter breakpoint was not set at ${SOURCE_FILE_NAME}:${USER_BREAKPOINT_LINE}`
          );
        }
        await new Promise((res) => setTimeout(res, 1500));
      }
    );

    await step(
      `Continue and halt at user breakpoint ${SOURCE_FILE_NAME}:${USER_BREAKPOINT_LINE}`,
      async () => {
        await debugToolbar!.continue();
        await debugToolbar!.waitForBreakPoint(60000);
        await assertNoOpenOcdFatal("after Continue");

        await waitForPausedAtLine(SOURCE_FILE_PATH, USER_BREAKPOINT_LINE, 30000);
        await waitForCallStackMatching(APP_MAIN_STACK_PATTERN, 15000);
      }
    );

    await step("Step Over and verify program counter advanced", async () => {
      await debugToolbar!.stepOver();
      await waitForPausedAtLine(
        SOURCE_FILE_PATH,
        STEP_OVER_TARGET_LINE,
        30000
      );
    });

    await step("Verify debug session still active after Step Over", async () => {
      const sessionAlive = await debugToolbar!.isDisplayed().catch(() => false);
      expect(
        sessionAlive,
        "Debug toolbar disappeared — session may have crashed"
      ).to.be.true;
      await assertNoOpenOcdFatal("after Step Over");
    });

    await step("Stop debug session", async () => {
      await stopDebugSession(debugToolbar!);
      state.activeDebugToolbar = undefined;
      await new BottomBarPanel().toggle(false);
    });

  }).timeout(999999);
});
