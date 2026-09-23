/*
 * Project: ESP-IDF VSCode Extension
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

import { exec } from "child_process";
import { promisify } from "util";
import { Key } from "selenium-webdriver";
import {
  BottomBarPanel,
  By,
  DebugConsoleView,
  DebugToolbar,
  InputBox,
  ModalDialog,
  StatusBar,
  Workbench,
} from "vscode-extension-tester";
import {
  dismissNotifications,
  ESP_IDF_COMMANDS,
  executeEspIdfCommand,
  findQuickPickByExactLabel,
  listQuickPickLabels,
} from "./project";

const execAsync = promisify(exec);

/**
 * Debug toolbar buttons are often not visible: VS Code hides the floating bar
 * after the Run and Debug view takes focus. Commands do not need that bar.
 */
const DEBUG_ACTIONS = {
  continue: "workbench.action.debug.continue",
  stepOver: "workbench.action.debug.stepOver",
  stepInto: "workbench.action.debug.stepInto",
  stepOut: "workbench.action.debug.stepOut",
  pause: "workbench.action.debug.pause",
  restart: "workbench.action.debug.restart",
  stop: "workbench.action.debug.stop",
} as const;

export async function executeDebugAction(
  action: keyof typeof DEBUG_ACTIONS
): Promise<void> {
  await new Workbench().executeCommand(DEBUG_ACTIONS[action]);
}

export async function delay(ms: number): Promise<void> {
  await new Promise((res) => setTimeout(res, ms));
}

export function logDebugSession(message: string): void {
  console.log(`[hardware-debug] ${message}`);
}

async function tryExecuteExactPaletteCommand(exactLabel: string): Promise<boolean> {
  try {
    logDebugSession(`Command palette exact: "${exactLabel}"`);
    await executeEspIdfCommand(exactLabel);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logDebugSession(`Palette "${exactLabel}" failed: ${message}`);
    try {
      const input = await InputBox.create(2000);
      await input.cancel();
    } catch {
      // Picker already closed.
    }
    return false;
  }
}

async function clickDebugToolbarAction(
  action: "disconnect" | "stop"
): Promise<boolean> {
  try {
    const toolbar = await DebugToolbar.create(4000);
    logDebugSession(`Clicking debug toolbar ${action}`);
    if (action === "disconnect") {
      await toolbar.disconnect();
    } else {
      await toolbar.stop();
    }
    logDebugSession(`Toolbar ${action} click sent`);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logDebugSession(`Toolbar ${action} not available: ${message}`);
    return false;
  }
}

async function sendShiftF5(): Promise<void> {
  logDebugSession("Sending Shift+F5 (Stop/Disconnect keybinding)");
  const driver = new Workbench().getDriver();
  await driver
    .actions()
    .keyDown(Key.SHIFT)
    .sendKeys(Key.F5)
    .keyUp(Key.SHIFT)
    .perform();
}

async function sendDisconnectActions(): Promise<void> {
  if (!(await isDebugToolbarVisible())) {
    logDebugSession("Debug toolbar not visible; skipping Disconnect clicks");
    return;
  }
  await clickDebugToolbarAction("disconnect");
  await delay(2000);
  if (!(await isDebugToolbarVisible())) {
    logDebugSession("Toolbar gone after Disconnect click");
    return;
  }
  await clickDebugToolbarAction("stop");
  await delay(2000);
  if (!(await isDebugToolbarVisible())) {
    return;
  }
  try {
    await sendShiftF5();
  } catch (err) {
    logDebugSession(
      `Shift+F5 failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

async function isDebugSessionAlive(): Promise<boolean> {
  if (await isDebugToolbarVisible()) {
    return true;
  }
  if (hasOpenOcdRunningStatus(await readStatusBarTexts())) {
    return true;
  }
  return (await leftoverDebugProcesses()).length > 0;
}

/**
 * Removes ANSI/VT100 escape sequences from a string.
 * `WebElement.getText()` on terminal-like views (Debug Console, Terminal) can
 * return raw bytes including colour codes that break regex matching.
 */
export function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1B\[[0-9;]*[A-Za-z]/g, "");
}

/**
 * Returns a clean (ANSI-stripped) snapshot of the Debug Console text.
 * GDB output appears in the Debug Console, not in the Terminal view.
 * `DebugConsoleView` inherits `getText()` from Selenium's `WebElement`, which
 * returns raw DOM text including ANSI codes — we strip them here so callers
 * can use plain-text regex patterns.
 */
export async function readDebugConsoleText(): Promise<string> {
  const panel = new BottomBarPanel();
  const debugConsole: DebugConsoleView = await panel.openDebugConsoleView();
  return stripAnsi(await debugConsole.getText());
}

/**
 * Types into the Debug Console REPL. CDT treats `>…` as a GDB CLI command.
 */
export async function evaluateDebugConsole(expression: string): Promise<void> {
  const panel = new BottomBarPanel();
  const debugConsole: DebugConsoleView = await panel.openDebugConsoleView();
  logDebugSession(`Debug Console: ${expression}`);
  await debugConsole.evaluateExpression(expression);
  await delay(1500);
}

/**
 * Visible Debug Console text is often a sliding window, not a full append-only
 * log. Reconstruct text that appeared after `before`.
 */
function debugConsoleNewText(before: string, last: string): string {
  if (last.startsWith(before)) {
    return last.slice(before.length);
  }
  const maxOverlap = Math.min(before.length, last.length, 8192);
  for (let overlap = maxOverlap; overlap > 0; overlap--) {
    if (last.startsWith(before.slice(-overlap))) {
      return last.slice(overlap);
    }
  }
  return last;
}

/**
 * Evaluates a Debug Console expression and waits for `pattern` in text that
 * appeared after the call, so earlier REPL output cannot satisfy the assertion.
 */
export async function evaluateDebugConsoleAndWait(
  expression: string,
  pattern: RegExp,
  timeoutMs: number
): Promise<string> {
  const before = await readDebugConsoleText();
  await evaluateDebugConsole(expression);
  const deadline = Date.now() + timeoutMs;
  let last = before;
  let delta = "";
  while (Date.now() < deadline) {
    last = await readDebugConsoleText();
    delta = debugConsoleNewText(before, last);
    if (pattern.test(delta)) {
      return delta;
    }
    await delay(1000);
  }
  throw new Error(
    `Timed out waiting for Debug Console append to match ${pattern} after ${expression}.\nAppended:\n${delta}`
  );
}

/**
 * Force-terminates leftover OpenOCD, CDT gdb-adapter, and chip GDB processes.
 * Last resort after VS Code Stop + OpenOCD Manager; `pkill` exit 1 is ignored.
 */
export async function killDebugProcesses(): Promise<void> {
  const patterns = [
    "gdb-adapter",
    "openocd",
    "xtensa-esp.*-gdb",
    "riscv32-esp.*-gdb",
  ];
  for (const pattern of patterns) {
    logDebugSession(`pkill -f "${pattern}"`);
    await execAsync(`pkill -f "${pattern}"`).catch(() => undefined);
  }
  await delay(3000);
}

async function leftoverDebugProcesses(): Promise<string[]> {
  try {
    const { stdout } = await execAsync(
      'pgrep -af "openocd|xtensa-esp|riscv32-esp" || true'
    );
    return stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(
        (line) =>
          line.length > 0 &&
          !line.includes("pgrep") &&
          !/\/bin\/sh -c/.test(line)
      );
  } catch {
    return [];
  }
}

async function logDebugRelatedProcesses(when: string): Promise<void> {
  try {
    const { stdout } = await execAsync(
      'pgrep -af "openocd|gdb-adapter|xtensa-esp|riscv32-esp" || true'
    );
    logDebugSession(`${when} processes:\n${stdout.trim() || "(none)"}`);
  } catch {
    logDebugSession(`${when} processes: (pgrep failed)`);
  }
}

async function readStatusBarTexts(): Promise<string[]> {
  try {
    const items = await new StatusBar().getItems();
    const texts: string[] = [];
    for (const item of items) {
      const text = (await item.getText().catch(() => "")).trim();
      if (text) {
        texts.push(text);
      }
    }
    return texts;
  } catch {
    return [];
  }
}

async function logStatusBar(when: string): Promise<string[]> {
  const texts = await readStatusBarTexts();
  logDebugSession(`${when} status bar: [${texts.join(" | ")}]`);
  return texts;
}

function hasGdbAdapterStatus(texts: string[]): boolean {
  return texts.some((text) => /GDB Adapter/i.test(text));
}

function hasOpenOcdRunningStatus(texts: string[]): boolean {
  return texts.some(
    (text) => /OpenOCD/i.test(text) && /Running/i.test(text)
  );
}

async function isDebugToolbarVisible(): Promise<boolean> {
  try {
    const toolbar = await DebugToolbar.create(2000);
    return await toolbar.isDisplayed();
  } catch {
    return false;
  }
}

async function waitForDebugToolbarGone(timeoutMs: number): Promise<boolean> {
  logDebugSession(`Waiting up to ${timeoutMs}ms for debug toolbar to disappear`);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const visible = await isDebugToolbarVisible();
    logDebugSession(`Debug toolbar visible: ${visible}`);
    if (!visible) {
      return true;
    }
    await delay(2000);
  }
  return false;
}

async function waitUntilStatusBarClears(
  stillPresent: (texts: string[]) => boolean,
  timeoutMs: number,
  what: string
): Promise<boolean> {
  logDebugSession(`Waiting up to ${timeoutMs}ms for ${what} to leave the status bar`);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const texts = await logStatusBar(`waiting for ${what} to clear`);
    if (!stillPresent(texts)) {
      return true;
    }
    await delay(2000);
  }
  return false;
}

/**
 * Palette: ESP-IDF: OpenOCD Manager → Stop OpenOCD.
 * If only Start OpenOCD is listed, the manager already considers it stopped.
 */
export async function stopOpenOcdViaManager(): Promise<void> {
  logDebugSession("Opening ESP-IDF: OpenOCD Manager");
  try {
    await executeEspIdfCommand(ESP_IDF_COMMANDS.openOcdManager);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logDebugSession(`Failed to open OpenOCD Manager: ${message}`);
    return;
  }

  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const inputBox = await InputBox.create(3000);
      const labels = await listQuickPickLabels(inputBox);
      logDebugSession(`OpenOCD Manager picks: [${labels.join(" | ")}]`);
      const stopPick = await findQuickPickByExactLabel(inputBox, "Stop OpenOCD");
      if (stopPick) {
        await stopPick.select();
        logDebugSession("Stop OpenOCD selected; waiting for SIGKILL and status bar");
        await delay(5000);
        return;
      }
      if (labels.includes("Start OpenOCD")) {
        logDebugSession("Only Start OpenOCD listed; cancelling picker");
        await inputBox.cancel();
        await delay(1000);
        return;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logDebugSession(`Waiting for OpenOCD Manager picker: ${message}`);
    }
    await delay(1000);
  }

  logDebugSession("Timed out waiting for OpenOCD Manager picker");
  try {
    const input = await InputBox.create(2000);
    await input.cancel();
  } catch {
    // Picker already closed.
  }
}

/**
 * Stops the VS Code gdbtarget attach session, then OpenOCD via the manager.
 * Attach sessions end with Disconnect (toolbar / Shift+F5), not debug.stop via
 * fuzzy command-palette confirm.
 */
export async function stopDebugSession(): Promise<void> {
  const startedAt = Date.now();
  logDebugSession("=== stopDebugSession begin ===");
  await dismissNotifications().catch(() => undefined);
  await logDebugRelatedProcesses("before stop");
  await logStatusBar("before stop");

  if (!(await isDebugSessionAlive())) {
    logDebugSession(
      "Session already stopped (no toolbar, OpenOCD not Running, no gdb/openocd). Ignoring leftover GDB Adapter status text."
    );
    await logStatusBar("after already-stopped short-circuit");
    logDebugSession(
      `=== stopDebugSession end (already stopped, ${Date.now() - startedAt}ms) ===`
    );
    return;
  }

  await dismissAlreadyRunningDebugDialog();
  logDebugSession("Ending attach session: toolbar Disconnect");
  await sendDisconnectActions();
  await delay(3000);

  if (await isDebugToolbarVisible()) {
    logDebugSession("Toolbar still visible; Disconnect once more");
    await sendDisconnectActions();
    await delay(3000);
  }

  const toolbarGone = !(await isDebugToolbarVisible());
  logDebugSession(`Debug toolbar gone: ${toolbarGone}`);

  if (hasOpenOcdRunningStatus(await readStatusBarTexts())) {
    await stopOpenOcdViaManager();
    await waitUntilStatusBarClears(
      hasOpenOcdRunningStatus,
      15000,
      "OpenOCD Server (Running)"
    );
  } else {
    logDebugSession("OpenOCD already Stopped; not opening OpenOCD Manager");
  }

  await logDebugRelatedProcesses("after UI stop");
  if ((await leftoverDebugProcesses()).length > 0) {
    logDebugSession("Force-killing leftover OpenOCD / chip GDB");
    await killDebugProcesses();
    await logDebugRelatedProcesses("after pkill");
  } else {
    logDebugSession("No leftover OpenOCD / GDB processes to pkill");
  }
  await logStatusBar("after stopDebugSession");
  logDebugSession(
    `=== stopDebugSession end (${Date.now() - startedAt}ms) ===`
  );
}

async function dismissAlreadyRunningViaModal(): Promise<boolean> {
  try {
    const dialog = new ModalDialog();
    const message = await dialog.getMessage();
    logDebugSession(`Modal dialog: ${message}`);
    if (!/already running/i.test(message)) {
      return false;
    }
    for (const title of ["Cancel", "No"]) {
      logDebugSession(`Modal: pushing "${title}"`);
      await dialog.pushButton(title);
      await delay(1000);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function dismissAlreadyRunningViaNotification(): Promise<boolean> {
  try {
    const notifications = await new Workbench().getNotifications();
    for (const notification of notifications) {
      const message = await notification.getMessage().catch(() => "");
      logDebugSession(`Notification: ${message}`);
      if (!/already running/i.test(message)) {
        continue;
      }
      for (const title of ["Cancel", "No"]) {
        try {
          logDebugSession(`Notification: takeAction "${title}"`);
          await notification.takeAction(title);
          await delay(1000);
          return true;
        } catch {
          // Button title may differ.
        }
      }
      await notification.dismiss().catch(() => undefined);
      return true;
    }
  } catch {
    // No notifications.
  }
  return false;
}

async function dismissAlreadyRunningViaDom(): Promise<boolean> {
  try {
    const driver = new Workbench().getDriver();
    const nodes = await driver.findElements(
      By.css(
        ".monaco-dialog-box, .dialog-shadow, [role='dialog'], .monaco-dialog-modal-block"
      )
    );
    for (const node of nodes) {
      const text = (await node.getText().catch(() => "")).trim();
      if (!text) {
        continue;
      }
      logDebugSession(`DOM dialog text: ${text.replace(/\s+/g, " ").slice(0, 300)}`);
      if (!/already running/i.test(text)) {
        continue;
      }
      const buttons = await node.findElements(
        By.css("a.monaco-button, .monaco-button, button")
      );
      for (const button of buttons) {
        const label = (await button.getText().catch(() => "")).trim();
        logDebugSession(`DOM dialog button: "${label}"`);
        if (/^(cancel|no)$/i.test(label)) {
          logDebugSession(`DOM dialog: clicking "${label}"`);
          await button.click();
          await delay(1000);
          return true;
        }
      }
    }
  } catch (err) {
    logDebugSession(
      `DOM dialog scan failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  return false;
}

/**
 * Cancel — never Yes. A second gdbtarget on the same OpenOCD port 3333 races.
 */
export async function dismissAlreadyRunningDebugDialog(): Promise<boolean> {
  if (await dismissAlreadyRunningViaModal()) {
    return true;
  }
  if (await dismissAlreadyRunningViaNotification()) {
    return true;
  }
  if (await dismissAlreadyRunningViaDom()) {
    return true;
  }
  return false;
}

async function waitForAlreadyRunningDialog(
  timeoutMs: number
): Promise<boolean> {
  logDebugSession(`Polling up to ${timeoutMs}ms for already-running adapter dialog`);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await dismissAlreadyRunningDebugDialog()) {
      return true;
    }
    await delay(1000);
  }
  logDebugSession("No already-running dialog detected");
  return false;
}

/**
 * F5 only after GDB Adapter is gone. Attach leftover + Start opens the
 * already-running modal; OpenOCD can still start in resolveDebugConfiguration.
 */
export async function launchDebugger(timeoutMs = 60000): Promise<DebugToolbar> {
  logDebugSession("=== launchDebugger begin ===");
  await dismissNotifications().catch(() => undefined);
  await logDebugRelatedProcesses("before launch");
  await logStatusBar("before launch");

  if (await isDebugSessionAlive()) {
    logDebugSession("Live session (toolbar/OpenOCD/gdb) before F5; Disconnect first");
    await stopDebugSession();
  } else {
    logDebugSession(
      "No live session (stale GDB Adapter status text is ignored); F5"
    );
  }

  logDebugSession("Sending workbench.action.debug.start");
  await new Workbench().executeCommand("workbench.action.debug.start");

  if (await waitForAlreadyRunningDialog(10000)) {
    logDebugSession("Cancelled leftover-session dialog; stopping then relaunching");
    await stopDebugSession();
    logDebugSession("Relaunching debugger");
    await new Workbench().executeCommand("workbench.action.debug.start");
    if (await waitForAlreadyRunningDialog(10000)) {
      await logStatusBar("after failed relaunch");
      throw new Error(
        "Eclipse CDT GDB Adapter still running after stop and relaunch"
      );
    }
  }

  logDebugSession(
    `Waiting up to ${timeoutMs}ms for debug toolbar (OpenOCD + GDB Adapter startup)`
  );
  const toolbar = await DebugToolbar.create(timeoutMs);
  logDebugSession("Debug toolbar appeared");
  await logStatusBar("after launch");
  logDebugSession("=== launchDebugger end ===");
  return toolbar;
}

/**
 * Lifecycle must not F5 while the first debug `it` still owns the attach
 * session — that is the already-running dialog. Restart re-runs `thb app_main`.
 */
export async function reuseOrLaunchDebugger(
  timeoutMs = 60000
): Promise<DebugToolbar> {
  const toolbarVisible = await isDebugToolbarVisible();
  await logStatusBar("reuseOrLaunchDebugger");
  logDebugSession(`reuseOrLaunchDebugger: toolbarVisible=${toolbarVisible}`);

  if (toolbarVisible) {
    logDebugSession("Reusing session via Restart (not F5)");
    try {
      const toolbar = await DebugToolbar.create(4000);
      logDebugSession("Clicking debug toolbar restart");
      await toolbar.restart();
    } catch (err) {
      logDebugSession(
        `Toolbar restart failed, using command: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      await executeDebugAction("restart");
    }
    await delay(5000);
    const toolbar = await DebugToolbar.create(timeoutMs);
    logDebugSession("Debug toolbar present after Restart");
    return toolbar;
  }

  logDebugSession("No debug toolbar; launching");
  return launchDebugger(timeoutMs);
}

/**
 * `waitForBreakPoint` locates Continue with the driver default (~5s).
 * Retry until `timeoutMs` so a hidden/Pause toolbar does not fail the step.
 */
export async function waitUntilDebugPaused(timeoutMs: number): Promise<void> {
  logDebugSession(`Waiting up to ${timeoutMs}ms for debug pause (Continue enabled)`);
  const deadline = Date.now() + timeoutMs;
  let lastError = "";
  while (Date.now() < deadline) {
    try {
      const toolbar = await DebugToolbar.create(5000);
      await toolbar.waitForBreakPoint(5000);
      logDebugSession("Debug pause detected (Continue enabled)");
      return;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      logDebugSession(`Not paused yet: ${lastError}`);
    }
    await delay(2000);
  }
  throw new Error(
    `Timed out waiting for debug pause after ${timeoutMs}ms. Last: ${lastError}`
  );
}
