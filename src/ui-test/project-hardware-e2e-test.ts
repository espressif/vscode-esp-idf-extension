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
  executeDebugAction,
  executeEspIdfCommand,
  executeEspIdfCommandAndSelectOption,
  helloWorldBinPath,
  launchDebugger,
  openTestProject,
  removeAllBreakpoints,
  reuseOrLaunchDebugger,
  selectFromCurrentPicker,
  setBreakpointInFile,
  stopDebugSession,
  testHardwareSerialPort,
  testWorkspaceDir,
  waitForBuildComplete,
  waitForCallStackMatching,
  evaluateDebugConsoleAndWait,
  waitForDebugConsoleText,
  waitForLocalVariable,
  waitForOutputChannelText,
  waitForPathAbsent,
  waitForPauseIndicatorGone,
  waitForPausedAtLine,
  waitForPausedLineInRange,
  waitForTerminalOutput,
  waitUntilDebugPaused,
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
// (a statement, not a step-into of the log macro). add_one() is after printf
// so these line numbers stay put.
const USER_BREAKPOINT_LINE = 9;
const STEP_OVER_TARGET_LINE = 10;
const STEP_INTO_CALL_LINE = 12;
const ADD_ONE_BODY_START = 16;
const ADD_ONE_BODY_END_EXCLUSIVE = 19;
const SOURCE_FILE_NAME = "hello_world_main.c";
const SOURCE_FILE_PATH = resolve(testWorkspaceDir, "main", SOURCE_FILE_NAME);
const APP_MAIN_STACK_PATTERN = /app_main/;
const GDBINIT_SOURCED_PATTERN =
  /source\s+\S*gdbinit|add-symbol-file\s+\S+/i;
const MEMSET_ADDRESS_PATTERN =
  /Symbol\s+"memset"\s+is[^\n]*\b(0x[0-9A-Fa-f]{4,})/i;

// ─── shared state ────────────────────────────────────────────────────────────

const state = {
  buildSucceeded: false,
  flashSucceeded: false,
  monitorSucceeded: false,
  jtagReady: false,
  debugSmokeSucceeded: false,
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
    await stopDebugSession();
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

    state.jtagReady = true;

    let debugToolbar: DebugToolbar;

    await step("Launch debugger", async () => {
      debugToolbar = await launchDebugger(60000);
      state.activeDebugToolbar = debugToolbar;
    });

    await step("Wait for default halt at app_main", async () => {
      await debugToolbar!.waitForBreakPoint(60000);
      await assertNoOpenOcdFatal("on attach");

      await waitForPausedLineInRange(
        SOURCE_FILE_PATH,
        6,
        USER_BREAKPOINT_LINE,
        30000
      );
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
        await executeDebugAction("continue");
        await debugToolbar!.waitForBreakPoint(60000);
        await assertNoOpenOcdFatal("after Continue");

        await waitForPausedAtLine(SOURCE_FILE_PATH, USER_BREAKPOINT_LINE, 30000);
        await waitForCallStackMatching(APP_MAIN_STACK_PATTERN, 15000);
      }
    );

    await step("Verify local a == 1 at user breakpoint", async () => {
      await waitForLocalVariable("a", 1, 20000);
    });

    await step("Step Over and verify program counter advanced", async () => {
      await executeDebugAction("stepOver");
      await waitForPausedAtLine(
        SOURCE_FILE_PATH,
        STEP_OVER_TARGET_LINE,
        30000
      );
    });

    await step("Verify local b == 2 after Step Over", async () => {
      await waitForLocalVariable("b", 2, 20000);
    });

    await step("Verify debug session still active after Step Over", async () => {
      const sessionAlive = await debugToolbar!.isDisplayed().catch(() => false);
      expect(
        sessionAlive,
        "Debug toolbar disappeared — session may have crashed"
      ).to.be.true;
      await assertNoOpenOcdFatal("after Step Over");
    });

    await step("Clear breakpoints; leave session paused for gdbinit and lifecycle", async () => {
      await removeAllBreakpoints().catch(() => undefined);
    });

    state.debugSmokeSucceeded = true;

  }).timeout(999999);

  it("resolves ROM symbols via gdbinit", async function () {
    if (!state.debugSmokeSucceeded) {
      this.skip();
    }

    await step("Wait until the leftover debug session is paused", async () => {
      await waitUntilDebugPaused(60000);
      await assertNoOpenOcdFatal("before gdbinit symbol check");
    });
    // after REBASE latest master changes with GDBinit changes included !!!!!!!!!
    // CDT Debug Console does not echo `source gdbinit` / `add-symbol-file`.
    // Re-enable when that output is visible (PR 1914 connect path).
    // await step("Debug Console sourced gdbinit / ROM ELF", async () => {
    //   const consoleText = await waitForDebugConsoleText(
    //     GDBINIT_SOURCED_PATTERN,
    //     20000
    //   );
    //   const sourced = consoleText.match(GDBINIT_SOURCED_PATTERN)?.[0];
    //   console.log(`[hardware-debug] ${sourced}`);
    // });

    await step("Open Debug Console", async () => {
      await new BottomBarPanel().openDebugConsoleView();
    });

    await step("GDB info address memset, then info symbol of that address", async () => {
      const addressText = await evaluateDebugConsoleAndWait(
        ">info address memset",
        MEMSET_ADDRESS_PATTERN,
        20000
      );
      if (/No symbol\s+"memset"/i.test(addressText)) {
        throw new Error(`GDB did not resolve memset:\n${addressText}`);
      }
      const memsetAddr = addressText.match(MEMSET_ADDRESS_PATTERN)?.[1];
      if (!memsetAddr) {
        throw new Error(`Could not parse memset address:\n${addressText}`);
      }
      console.log(`[hardware-debug] memset at ${memsetAddr}`);

      const symbolText = await evaluateDebugConsoleAndWait(
        `>info symbol ${memsetAddr}`,
        /in section|No symbol matches|\bmemset\b|\b__call_memset\b/i,
        20000
      );
      if (/No symbol matches/i.test(symbolText)) {
        throw new Error(
          `GDB did not reverse-lookup ${memsetAddr} (ROM symbols missing?):\n${symbolText}`
        );
      }
      console.log(`[hardware-debug] ${symbolText.trim().split("\n").slice(0, 4).join(" ")}`);
    });
  }).timeout(999999);

  it("debugs session lifecycle via JTAG", async function () {
    if (!state.jtagReady) {
      this.skip();
    }

    await dismissNotifications();

    let debugToolbar: DebugToolbar;

    await step("Reuse debug session via Restart (do not F5)", async () => {
      debugToolbar = await reuseOrLaunchDebugger(60000);
      state.activeDebugToolbar = debugToolbar;
    });

    await step("Wait for default halt at app_main", async () => {
      await waitUntilDebugPaused(60000);
      await assertNoOpenOcdFatal("on attach");
      try {
        await waitForPausedLineInRange(
          SOURCE_FILE_PATH,
          6,
          USER_BREAKPOINT_LINE,
          30000
        );
      } catch {
        console.log(
          "[hardware-debug] Halt was not in app_main; Restart and wait again"
        );
        await executeDebugAction("restart");
        await new Promise((res) => setTimeout(res, 5000));
        debugToolbar = await DebugToolbar.create(60000);
        state.activeDebugToolbar = debugToolbar;
        await waitUntilDebugPaused(60000);
        await assertNoOpenOcdFatal("on restart after leftover halt");
        await waitForPausedLineInRange(
          SOURCE_FILE_PATH,
          6,
          USER_BREAKPOINT_LINE,
          60000
        );
      }
      await waitForCallStackMatching(APP_MAIN_STACK_PATTERN, 30000);
    });

    await step("Continue, then Pause while target is running", async () => {
      await executeDebugAction("continue");
      await waitForPauseIndicatorGone(SOURCE_FILE_PATH, 30000);
      await new Promise((res) => setTimeout(res, 2000));
      await executeDebugAction("pause");
      await waitUntilDebugPaused(60000);
      await assertNoOpenOcdFatal("after Pause");
    });

    await step("Restart and halt at app_main again", async () => {
      await executeDebugAction("restart");
      await new Promise((res) => setTimeout(res, 5000));
      debugToolbar = await DebugToolbar.create(60000);
      state.activeDebugToolbar = debugToolbar;
      await waitUntilDebugPaused(60000);
      await assertNoOpenOcdFatal("after Restart");
      await waitForPausedLineInRange(
        SOURCE_FILE_PATH,
        6,
        USER_BREAKPOINT_LINE,
        60000
      );
      await waitForCallStackMatching(APP_MAIN_STACK_PATTERN, 30000);
    });

    await step("Step Into add_one, then Step Out", async () => {
      await setBreakpointInFile(SOURCE_FILE_PATH, STEP_INTO_CALL_LINE);
      await new Promise((res) => setTimeout(res, 1500));
      await executeDebugAction("continue");
      await waitUntilDebugPaused(60000);
      await waitForPausedAtLine(SOURCE_FILE_PATH, STEP_INTO_CALL_LINE, 30000);

      await executeDebugAction("stepInto");
      await waitUntilDebugPaused(30000);
      await waitForPausedLineInRange(
        SOURCE_FILE_PATH,
        ADD_ONE_BODY_START,
        ADD_ONE_BODY_END_EXCLUSIVE,
        30000
      );
      await waitForCallStackMatching(/add_one/, 15000);

      await executeDebugAction("stepOut");
      await waitUntilDebugPaused(30000);
      await waitForCallStackMatching(APP_MAIN_STACK_PATTERN, 15000);
      await waitForPausedLineInRange(
        SOURCE_FILE_PATH,
        STEP_INTO_CALL_LINE,
        15,
        30000
      );

      await removeAllBreakpoints();
      await executeDebugAction("restart");
      await new Promise((res) => setTimeout(res, 5000));
      debugToolbar = await DebugToolbar.create(60000);
      state.activeDebugToolbar = debugToolbar;
      await waitUntilDebugPaused(60000);
      await assertNoOpenOcdFatal("after Step Out restart");
      await waitForPausedLineInRange(
        SOURCE_FILE_PATH,
        6,
        USER_BREAKPOINT_LINE,
        60000
      );
      await waitForCallStackMatching(APP_MAIN_STACK_PATTERN, 30000);
    });

    await step(
      `Set gutter breakpoint at ${SOURCE_FILE_NAME}:${USER_BREAKPOINT_LINE}`,
      async () => {
        await setBreakpointInFile(SOURCE_FILE_PATH, USER_BREAKPOINT_LINE);
        await new Promise((res) => setTimeout(res, 2000));
      }
    );

    await step(
      `Continue and halt at user breakpoint ${SOURCE_FILE_NAME}:${USER_BREAKPOINT_LINE}`,
      async () => {
        await executeDebugAction("continue");
        await waitUntilDebugPaused(60000);
        await waitForPausedAtLine(SOURCE_FILE_PATH, USER_BREAKPOINT_LINE, 30000);
      }
    );

    await step(
      `Remove breakpoint and Continue past ${SOURCE_FILE_NAME}:${USER_BREAKPOINT_LINE}`,
      async () => {
        await removeAllBreakpoints();
        const editor = (await new EditorView().openEditor(
          SOURCE_FILE_NAME
        )) as TextEditor;
        const leftover = await editor.getBreakpoint(USER_BREAKPOINT_LINE);
        if (leftover) {
          throw new Error(
            `Gutter breakpoint still present at ${SOURCE_FILE_NAME}:${USER_BREAKPOINT_LINE}`
          );
        }

        await executeDebugAction("continue");
        await waitForPauseIndicatorGone(SOURCE_FILE_PATH, 30000);
        await assertNoOpenOcdFatal("after removing breakpoint");
      }
    );

    await step("Stop debug session", async () => {
      await stopDebugSession();
      state.activeDebugToolbar = undefined;
      await removeAllBreakpoints().catch(() => undefined);
      await new BottomBarPanel().toggle(false).catch(() => undefined);
    });
  }).timeout(999999);
});
