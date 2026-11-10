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
import { Key, WebElement } from "selenium-webdriver";
import {
  BottomBarPanel,
  By,
  DebugToolbar,
  EditorView,
  TextEditor,
  Workbench,
} from "vscode-extension-tester";
import {
  ESP_IDF_COMMANDS,
  delay,
  dismissNotifications,
  executeDebugAction,
  executeEspIdfCommand,
  executeEspIdfCommandAndSelectOption,
  helloWorldBinPath,
  launchDebugger,
  openFileInEditor,
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
// so lines 9–12 stay put. The loop is after that call, and add_one() shifts
// down with it.
const USER_BREAKPOINT_LINE = 9;
const STEP_OVER_TARGET_LINE = 10;
const STEP_INTO_CALL_LINE = 12;
const ADD_ONE_BODY_START = 22;
const ADD_ONE_BODY_END_EXCLUSIVE = 25;
const LOOP_HEAD_LINE = 16;
const CONDITIONAL_BREAKPOINT_LINE = 17;
const CONDITIONAL_HIT_VALUE = 2;
const SOURCE_FILE_NAME = "hello_world_main.c";
const SOURCE_FILE_PATH = resolve(testWorkspaceDir, "main", SOURCE_FILE_NAME);
const APP_MAIN_STACK_PATTERN = /app_main/;
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

let skipRemainingSteps = false;

/**
 * Registers a scenario as its own Mocha suite. Each `step()` becomes a test,
 * so the CI summary lists steps under the scenario instead of one `it` title.
 * A failed step skips the rest of that scenario.
 */
function scenario(title: string, defineSteps: () => void): void {
  describe(title, function () {
    before(function () {
      skipRemainingSteps = false;
    });
    defineSteps();
  });
}

function step(stepName: string, action: () => Promise<void>): void {
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
      console.log(`  ✗ [step] ${stepName}\n${orig}`);
      throw new Error(`Test failed at: ${stepName}\n${orig}`);
    }
  });
}

function breakpointAtLine(line: number): RegExp {
  const fileName = SOURCE_FILE_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `breakpoint\\s+\\d+\\s+at\\b[^\\n]*${fileName}, line ${line}\\b`,
    "i"
  );
}

function conditionStillSet(expression: string): RegExp {
  return new RegExp(`stop only if \\(?${expression}\\)?`, "i");
}

function failureText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function activeElementIsInside(widget: WebElement): Promise<boolean> {
  const driver = new Workbench().getDriver();
  const active = await driver.switchTo().activeElement();
  return driver.executeScript<boolean>(
    "const widget = arguments[0]; const active = arguments[1]; return !!(widget && active && (widget === active || widget.contains(active)));",
    widget,
    active
  );
}

/**
 * Types into the editor condition widget only when that widget owns focus.
 * Otherwise the keystrokes would land in hello_world_main.c.
 */
async function typeIntoConditionalBreakpointWidget(
  expression: string
): Promise<void> {
  await new Workbench().executeCommand(
    "editor.debug.action.conditionalBreakpoint"
  );
  const driver = new Workbench().getDriver();
  const deadline = Date.now() + 10000;
  let widget: WebElement | undefined;
  while (Date.now() < deadline) {
    const found = await driver.findElements(By.css(".breakpoint-widget"));
    if (found.length > 0) {
      widget = found[0];
      break;
    }
    await delay(200);
  }
  if (!widget) {
    throw new Error(
      `Conditional breakpoint widget did not appear for ${SOURCE_FILE_NAME}:${CONDITIONAL_BREAKPOINT_LINE}. "${expression}" was not typed, so the source file was left unchanged.`
    );
  }

  const focused = await activeElementIsInside(widget).catch(() => false);
  if (!focused) {
    const active = await driver.switchTo().activeElement().catch(() => undefined);
    const tag = (await active?.getTagName().catch(() => "")) ?? "none";
    const className = (await active?.getAttribute("class").catch(() => "")) ?? "";
    throw new Error(
      `Conditional breakpoint widget is open but focus is outside it (${tag}${className ? "." + className : ""}). Refusing to type "${expression}" so the editor does not receive it.`
    );
  }

  const active = await driver.switchTo().activeElement();
  await active.sendKeys(expression, Key.ENTER);
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

  scenario("builds testWorkspace", () => {
    step("Full clean", async () => {
      await executeEspIdfCommand(ESP_IDF_COMMANDS.fullClean);
      await waitForPathAbsent(helloWorldBinPath, 60000);
    });

    step("Build project", async () => {
      await executeEspIdfCommand(ESP_IDF_COMMANDS.build);
      const buildOutput = await waitForBuildComplete(helloWorldBinPath, 300000);
      console.log(buildOutput);
      state.buildSucceeded = true;
    });
  });

  // ── flash ──────────────────────────────────────────────────────────────────

  scenario("flashes testWorkspace", () => {
    before(function () {
      if (!state.buildSucceeded) {
        this.skip();
      }
    });

    step(`Select serial port ${testHardwareSerialPort}`, async () => {
      await executeEspIdfCommandAndSelectOption(
        ESP_IDF_COMMANDS.selectPort,
        testHardwareSerialPort
      );
    });

    step("Select UART flash method", async () => {
      await executeEspIdfCommandAndSelectOption(
        ESP_IDF_COMMANDS.selectFlashMethod,
        "UART"
      );
    });

    step("Flash project and verify success", async () => {
      await executeEspIdfCommand(ESP_IDF_COMMANDS.flash);
      const flashOutput = await waitForTerminalOutput(
        FLASH_SUCCESS_PATTERN,
        180000
      );
      console.log(flashOutput);
      expect(FLASH_SUCCESS_PATTERN.test(flashOutput)).to.be.true;
      state.flashSucceeded = true;
    });
  });

  // ── monitor ────────────────────────────────────────────────────────────────

  scenario("shows expected monitor output", () => {
    before(function () {
      if (!state.flashSucceeded) {
        this.skip();
      }
    });

    step(`Select monitor port ${testHardwareSerialPort}`, async () => {
      await executeEspIdfCommandAndSelectOption(
        ESP_IDF_COMMANDS.selectMonitorPort,
        testHardwareSerialPort
      );
    });

    step("Start monitor and verify expected output", async () => {
      await executeEspIdfCommand(ESP_IDF_COMMANDS.monitor);
      const monitorOutput = await waitForTerminalOutput(
        MONITOR_OUTPUT_PATTERN,
        120000
      );
      console.log(monitorOutput);
      expect(MONITOR_OUTPUT_PATTERN.test(monitorOutput)).to.be.true;
    });

    step("Kill monitor terminal", async () => {
      await new Workbench().executeCommand("workbench.action.terminal.kill");
      await new Promise((res) => setTimeout(res, 2000));
      state.monitorSucceeded = true;
    });
  });

  // ── debug ──────────────────────────────────────────────────────────────────

  scenario("debugs testWorkspace via JTAG on ESP32 ETHERNET KIT", () => {
    let debugToolbar: DebugToolbar;

    before(async function () {
      if (!state.flashSucceeded || !state.monitorSucceeded) {
        this.skip();
      }
      await dismissNotifications();
    });

    step("Select JTAG flash method", async () => {
      await executeEspIdfCommandAndSelectOption(
        ESP_IDF_COMMANDS.selectFlashMethod,
        "JTAG"
      );
    });

    step("Set target esp32 and board ESP32-ETHERNET-KIT", async () => {
      await executeEspIdfCommand(ESP_IDF_COMMANDS.setTarget);
      await new Promise((res) => setTimeout(res, 1000));
      await selectFromCurrentPicker("esp32", 15000);
      await new Promise((res) => setTimeout(res, 1000));
      await selectFromCurrentPicker("ESP32-ETHERNET-KIT", 15000);
    });

    step("Wait for idf.py set-target to complete", async () => {
      await waitForOutputChannelText(
        "ESP-IDF",
        SET_TARGET_COMPLETE_PATTERN,
        120000
      );
    });

    step("Rebuild project for the new target", async () => {
      await executeEspIdfCommand(ESP_IDF_COMMANDS.fullClean);
      await waitForPathAbsent(helloWorldBinPath, 60000);
      await executeEspIdfCommand(ESP_IDF_COMMANDS.build);
      await waitForBuildComplete(helloWorldBinPath, 300000);
      state.jtagReady = true;
    });

    step("Launch debugger", async () => {
      debugToolbar = await launchDebugger(60000);
      state.activeDebugToolbar = debugToolbar;
    });

    step("Wait for default halt at app_main", async () => {
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

    step(
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

    step(
      `Continue and halt at user breakpoint ${SOURCE_FILE_NAME}:${USER_BREAKPOINT_LINE}`,
      async () => {
        await executeDebugAction("continue");
        await debugToolbar!.waitForBreakPoint(60000);
        await assertNoOpenOcdFatal("after Continue");

        await waitForPausedAtLine(SOURCE_FILE_PATH, USER_BREAKPOINT_LINE, 30000);
        await waitForCallStackMatching(APP_MAIN_STACK_PATTERN, 15000);
      }
    );

    step("Verify local a == 1 at user breakpoint", async () => {
      await waitForLocalVariable("a", 1, 20000);
    });

    step("Step Over and verify program counter advanced", async () => {
      await executeDebugAction("stepOver");
      await waitForPausedAtLine(
        SOURCE_FILE_PATH,
        STEP_OVER_TARGET_LINE,
        30000
      );
    });

    step("Verify local b == 2 after Step Over", async () => {
      await waitForLocalVariable("b", 2, 20000);
    });

    step("Verify debug session still active after Step Over", async () => {
      const sessionAlive = await debugToolbar!.isDisplayed().catch(() => false);
      expect(
        sessionAlive,
        "Debug toolbar disappeared — session may have crashed"
      ).to.be.true;
      await assertNoOpenOcdFatal("after Step Over");
    });

    step("Clear breakpoints; leave session paused for gdbinit and lifecycle", async () => {
      await removeAllBreakpoints().catch(() => undefined);
      state.debugSmokeSucceeded = true;
    });
  });

  scenario("resolves ROM symbols via gdbinit", () => {
    before(function () {
      if (!state.debugSmokeSucceeded) {
        this.skip();
      }
    });

    step("Wait until the leftover debug session is paused", async () => {
      await waitUntilDebugPaused(60000);
      await assertNoOpenOcdFatal("before gdbinit symbol check");
    });

    step("Open Debug Console", async () => {
      await new BottomBarPanel().openDebugConsoleView();
    });

    step("GDB info address memset, then info symbol of that address", async () => {
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
        /in section|No symbol matches/i,
        20000
      );
      if (/No symbol matches/i.test(symbolText)) {
        throw new Error(
          `GDB did not reverse-lookup ${memsetAddr} (ROM symbols missing?):\n${symbolText}`
        );
      }
      console.log(`[hardware-debug] ${symbolText.trim().split("\n").slice(0, 4).join(" ")}`);
    });
  });

  scenario("stops on a conditional breakpoint set from the editor", () => {
    const condition = `i == ${CONDITIONAL_HIT_VALUE}`;

    before(function () {
      if (!state.debugSmokeSucceeded) {
        this.skip();
      }
    });

    after(async function () {
      this.timeout(30000);
      await removeAllBreakpoints().catch((err) => {
        console.log(
          `[hardware-debug] Could not clear breakpoints after the editor condition scenario: ${failureText(err)}`
        );
      });
    });

    step("Wait until the leftover debug session is paused", async () => {
      try {
        await waitUntilDebugPaused(60000);
      } catch (err) {
        throw new Error(
          `Debug session was not paused before the editor condition widget.\n${failureText(err)}`
        );
      }
      await assertNoOpenOcdFatal("before conditional breakpoint");
    });

    step("Run to the loop head with i == 0", async () => {
      let breakText = "";
      try {
        breakText = await evaluateDebugConsoleAndWait(
          `>tbreak ${SOURCE_FILE_NAME}:${LOOP_HEAD_LINE}`,
          breakpointAtLine(LOOP_HEAD_LINE),
          20000
        );
      } catch (err) {
        throw new Error(
          `Temporary breakpoint on the while line (${SOURCE_FILE_NAME}:${LOOP_HEAD_LINE}) was not confirmed, so i is not in scope for the condition.\n${failureText(err)}`
        );
      }
      console.log(
        `[hardware-debug] ${breakText.trim().split("\n").slice(0, 3).join(" ")}`
      );
      await executeDebugAction("continue");
      try {
        await waitUntilDebugPaused(60000);
        await waitForPausedAtLine(SOURCE_FILE_PATH, LOOP_HEAD_LINE, 30000);
        await waitForLocalVariable("i", 0, 20000);
      } catch (err) {
        throw new Error(
          `Did not stop on ${SOURCE_FILE_NAME}:${LOOP_HEAD_LINE} with i == 0 before setting the editor condition.\n${failureText(err)}`
        );
      }
    });

    step(`Set editor conditional breakpoint ${condition} on a = i`, async () => {
      await dismissNotifications();
      let editor: TextEditor;
      try {
        editor = await openFileInEditor(SOURCE_FILE_PATH);
        await editor.setCursor(CONDITIONAL_BREAKPOINT_LINE, 1, 10000);
      } catch (err) {
        throw new Error(
          `Could not place the cursor on ${SOURCE_FILE_NAME}:${CONDITIONAL_BREAKPOINT_LINE} before opening the condition widget.\n${failureText(err)}`
        );
      }
      const [cursorLine] = await editor.getCoordinates();
      if (cursorLine !== CONDITIONAL_BREAKPOINT_LINE) {
        throw new Error(
          `Cursor is on line ${cursorLine}, expected ${CONDITIONAL_BREAKPOINT_LINE} (${SOURCE_FILE_NAME}). The condition widget was not opened.`
        );
      }

      await typeIntoConditionalBreakpointWidget(condition);

      const sourceLine = await editor.getTextAtLine(CONDITIONAL_BREAKPOINT_LINE);
      if (sourceLine.includes(condition) || !/a\s*=\s*i/.test(sourceLine)) {
        throw new Error(
          `Source line ${CONDITIONAL_BREAKPOINT_LINE} changed while setting the condition. It is now:\n${sourceLine}`
        );
      }

      const deadline = Date.now() + 10000;
      let gutter = await editor.getBreakpoint(CONDITIONAL_BREAKPOINT_LINE);
      while (!gutter && Date.now() < deadline) {
        await delay(500);
        gutter = await editor.getBreakpoint(CONDITIONAL_BREAKPOINT_LINE);
      }
      if (!gutter) {
        throw new Error(
          `No gutter breakpoint at ${SOURCE_FILE_NAME}:${CONDITIONAL_BREAKPOINT_LINE} after submitting "${condition}" in the editor widget.`
        );
      }
    });

    step(`Confirm GDB stored stop only if ${condition}`, async () => {
      let infoText = "";
      try {
        infoText = await evaluateDebugConsoleAndWait(
          ">info breakpoints",
          conditionStillSet(condition),
          20000
        );
      } catch (err) {
        throw new Error(
          `Editor breakpoint at ${SOURCE_FILE_NAME}:${CONDITIONAL_BREAKPOINT_LINE} did not reach GDB as "stop only if ${condition}".\n${failureText(err)}`
        );
      }
      console.log(
        `[hardware-debug] ${infoText.trim().split("\n").slice(0, 6).join(" ")}`
      );
    });

    step(`Continue and halt only when ${condition}`, async () => {
      await executeDebugAction("continue");
      try {
        await waitUntilDebugPaused(60000);
        await assertNoOpenOcdFatal("after conditional breakpoint");
        await waitForPausedAtLine(
          SOURCE_FILE_PATH,
          CONDITIONAL_BREAKPOINT_LINE,
          30000
        );
        await waitForCallStackMatching(APP_MAIN_STACK_PATTERN, 15000);
        await waitForLocalVariable("i", CONDITIONAL_HIT_VALUE, 20000);
      } catch (err) {
        throw new Error(
          `Conditional breakpoint "${condition}" did not stop on ${SOURCE_FILE_NAME}:${CONDITIONAL_BREAKPOINT_LINE} with i == ${CONDITIONAL_HIT_VALUE}. A plain breakpoint would have stopped at i == 0.\n${failureText(err)}`
        );
      }
    });

    step("Clear the editor conditional breakpoint", async () => {
      await removeAllBreakpoints();
      const editor = (await new EditorView().openEditor(
        SOURCE_FILE_NAME
      )) as TextEditor;
      const leftover = await editor.getBreakpoint(CONDITIONAL_BREAKPOINT_LINE);
      if (leftover) {
        throw new Error(
          `Gutter breakpoint is still present at ${SOURCE_FILE_NAME}:${CONDITIONAL_BREAKPOINT_LINE} after removeAllBreakpoints.`
        );
      }
      let infoText = "";
      try {
        infoText = await evaluateDebugConsoleAndWait(
          ">info breakpoints",
          /No breakpoints\b|Num\s+Type/i,
          20000
        );
      } catch (err) {
        throw new Error(
          `Could not read GDB's breakpoint list after removeAllBreakpoints.\n${failureText(err)}`
        );
      }
      if (conditionStillSet(condition).test(infoText)) {
        throw new Error(
          `GDB still has "stop only if ${condition}" after removeAllBreakpoints.\n${infoText}`
        );
      }
    });
  });

  scenario("debugs session lifecycle via JTAG", () => {
    let debugToolbar: DebugToolbar;

    before(async function () {
      if (!state.jtagReady) {
        this.skip();
      }
      await dismissNotifications();
    });

    step("Reuse debug session via Restart (do not F5)", async () => {
      debugToolbar = await reuseOrLaunchDebugger(60000);
      state.activeDebugToolbar = debugToolbar;
    });

    step("Wait for default halt at app_main", async () => {
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

    step("Continue, then Pause while target is running", async () => {
      await executeDebugAction("continue");
      await waitForPauseIndicatorGone(SOURCE_FILE_PATH, 30000);
      await new Promise((res) => setTimeout(res, 2000));
      await executeDebugAction("pause");
      await waitUntilDebugPaused(60000);
      await assertNoOpenOcdFatal("after Pause");
    });

    step("Restart and halt at app_main again", async () => {
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

    step("Step Into add_one, then Step Out", async () => {
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

    step(
      `Set gutter breakpoint at ${SOURCE_FILE_NAME}:${USER_BREAKPOINT_LINE}`,
      async () => {
        await setBreakpointInFile(SOURCE_FILE_PATH, USER_BREAKPOINT_LINE);
        await new Promise((res) => setTimeout(res, 2000));
      }
    );

    step(
      `Continue and halt at user breakpoint ${SOURCE_FILE_NAME}:${USER_BREAKPOINT_LINE}`,
      async () => {
        await executeDebugAction("continue");
        await waitUntilDebugPaused(60000);
        await waitForPausedAtLine(SOURCE_FILE_PATH, USER_BREAKPOINT_LINE, 30000);
      }
    );

    step(
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

    step("Stop debug session", async () => {
      await stopDebugSession();
      state.activeDebugToolbar = undefined;
      await removeAllBreakpoints().catch(() => undefined);
      await new BottomBarPanel().toggle(false).catch(() => undefined);
    });
  });
});
