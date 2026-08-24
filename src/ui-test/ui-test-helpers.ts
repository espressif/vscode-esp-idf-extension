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
import { pathExists } from "fs-extra";
import { resolve } from "path";
import { promisify } from "util";
import {
  ActivityBar,
  BottomBarPanel,
  DebugConsoleView,
  DebugView,
  EditorView,
  InputBox,
  OutputView,
  TextEditor,
  Workbench,
} from "vscode-extension-tester";

const execAsync = promisify(exec);

const BUILD_FAILURE_PATTERN =
  /ninja: build stopped|CMake Error|FAILED:|ninja: error|Compilation failed/i;

export const testWorkspaceDir = resolve(
  __dirname,
  "..",
  "..",
  "testFiles",
  "testWorkspace"
);

export const helloWorldBinPath = resolve(
  testWorkspaceDir,
  "build",
  "hello-world.bin"
);

export const testHardwareSerialPort =
  process.env.IDF_UI_TEST_SERIAL_PORT ?? "/dev/ttyUSB1";

export async function dismissNotifications(): Promise<void> {
  const notifications = await new Workbench().getNotifications();
  for (const notification of notifications) {
    await notification.dismiss();
  }
}

export async function waitForTerminalOutput(
  pattern: RegExp,
  timeoutMs: number
): Promise<string> {
  const panel = new BottomBarPanel();
  const terminalView = await panel.openTerminalView();
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const text = await terminalView.getText();
    if (pattern.test(text)) {
      return text;
    }
    await new Promise((res) => setTimeout(res, 5000));
  }

  const text = await terminalView.getText();
  throw new Error(
    `Timed out waiting for terminal output matching ${pattern}. Last output:\n${text}`
  );
}

export async function waitForPathAbsent(
  filePath: string,
  timeoutMs: number
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (!(await pathExists(filePath))) {
      return;
    }
    await new Promise((res) => setTimeout(res, 2000));
  }

  throw new Error(`Timed out waiting for file to be removed: ${filePath}`);
}

async function readTerminalText(): Promise<string> {
  const panel = new BottomBarPanel();
  const terminalView = await panel.openTerminalView();
  return terminalView.getText();
}

function throwIfBuildFailed(terminalText: string): void {
  if (BUILD_FAILURE_PATTERN.test(terminalText)) {
    throw new Error(`Build failed. Terminal output:\n${terminalText}`);
  }
}

export async function waitForBuildComplete(
  binPath: string,
  timeoutMs: number
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let lastFailureCheck = 0;
  const failureCheckIntervalMs = 30000;

  while (Date.now() < deadline) {
    if (await pathExists(binPath)) {
      return `Build complete: ${binPath}`;
    }

    const now = Date.now();
    if (now - lastFailureCheck >= failureCheckIntervalMs) {
      lastFailureCheck = now;
      throwIfBuildFailed(await readTerminalText());
    }

    await new Promise((res) => setTimeout(res, 2000));
  }

  const text = await readTerminalText();
  throwIfBuildFailed(text);
  const binExists = await pathExists(binPath);
  throw new Error(
    `Timed out waiting for build to complete. bin exists: ${binExists}. Last terminal output:\n${text}`
  );
}

/** Must match command palette labels exactly (category + package.nls title). */
export const ESP_IDF_COMMANDS = {
  fullClean: "ESP-IDF: Full Clean Project",
  build: "ESP-IDF: Build Your Project",
  selectPort: "ESP-IDF: Select Port to Use (COM, tty, usbserial)",
  selectMonitorPort:
    "ESP-IDF: Select Monitor Port to Use (COM, tty, usbserial)",
  selectFlashMethod: "ESP-IDF: Select Flash Method",
  setTarget: "ESP-IDF: Set Espressif Device Target",
  flash: "ESP-IDF: Flash Your Project",
  monitor: "ESP-IDF: Monitor Device",
  buildFlashMonitor:
    "ESP-IDF: Build, Flash and Start a Monitor on Your Device",
} as const;

export async function openTestProject(): Promise<void> {
  await new Promise((res) => setTimeout(res, 5000));
  await new Workbench().executeCommand("file: open folder");
  await new Promise((res) => setTimeout(res, 1000));
  const input = await InputBox.create();
  await input.setText(testWorkspaceDir);
  await input.confirm();
  await new Promise((res) => setTimeout(res, 4000));
}

export async function executeEspIdfCommand(exactCommandLabel: string): Promise<void> {
  const workbench = new Workbench();
  const prompt = await workbench.openCommandPrompt();
  await prompt.setText(`>${exactCommandLabel}`);
  await new Promise((res) => setTimeout(res, 1500));
  await selectCommandPaletteItem(exactCommandLabel);
}

async function selectCommandPaletteItem(exactCommandLabel: string): Promise<void> {
  const inputBox = await InputBox.create();
  const pick = await findQuickPickByExactLabel(inputBox, exactCommandLabel);
  if (pick) {
    await pick.select();
    return;
  }

  if (exactCommandLabel === ESP_IDF_COMMANDS.selectPort) {
    const flashPortPick = await findSelectPortCommandPick(inputBox);
    if (flashPortPick) {
      await flashPortPick.select();
      return;
    }
  }

  const labels = await listQuickPickLabels(inputBox);
  throw new Error(
    `Exact command palette match not found: "${exactCommandLabel}". Visible: [${labels.join(" | ")}]`
  );
}

async function findSelectPortCommandPick(inputBox: InputBox) {
  const picks = await inputBox.getQuickPicks();
  for (const pick of picks) {
    const label = await pick.getLabel();
    if (label.includes("Select Port to Use") && !label.includes("Monitor")) {
      return pick;
    }
  }
  return undefined;
}

export async function executeEspIdfCommandAndSelectOption(
  exactCommandLabel: string,
  option: string | number
): Promise<void> {
  await executeEspIdfCommand(exactCommandLabel);
  await new Promise((res) => setTimeout(res, 2000));

  if (typeof option === "number") {
    const inputBox = await InputBox.create();
    await inputBox.selectQuickPick(option);
  } else {
    const inputBox = await InputBox.create();
    await inputBox.setText(option);
    await new Promise((res) => setTimeout(res, 500));
    await selectQuickPickByExactLabel(option);
  }

  await new Promise((res) => setTimeout(res, 1000));
}

async function selectQuickPickByExactLabel(exactLabel: string): Promise<void> {
  const inputBox = await InputBox.create();
  const pick = await findQuickPickByExactLabel(inputBox, exactLabel);
  if (!pick) {
    const labels = await listQuickPickLabels(inputBox);
    throw new Error(
      `Exact quick pick label not found: "${exactLabel}". Visible: [${labels.join(" | ")}]`
    );
  }
  await pick.select();
}

async function findQuickPickByExactLabel(inputBox: InputBox, exactLabel: string) {
  const picks = await inputBox.getQuickPicks();
  for (const pick of picks) {
    if ((await pick.getLabel()) === exactLabel) {
      return pick;
    }
  }
  return undefined;
}

async function listQuickPickLabels(inputBox: InputBox): Promise<string[]> {
  const picks = await inputBox.getQuickPicks();
  return Promise.all(picks.map((pick) => pick.getLabel()));
}

/**
 * Polls until a quick pick containing `option` appears and selects it.
 * Used for pickers that open asynchronously after a command (e.g. the OpenOCD
 * board-config picker shown by Set Espressif Device Target).
 */
export async function selectFromCurrentPicker(
  option: string,
  timeoutMs = 20000
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastVisibleLabels: string[] = [];

  while (Date.now() < deadline) {
    try {
      const inputBox = await InputBox.create(2000);
      const rawPicks = await inputBox.getQuickPicks();
      if (rawPicks.length === 0) {
        await new Promise((res) => setTimeout(res, 1000));
        continue;
      }
      await inputBox.setText(option);
      await new Promise((res) => setTimeout(res, 500));
      const filtered = await inputBox.getQuickPicks();
      for (const pick of filtered) {
        if ((await pick.getLabel()) === option) {
          await pick.select();
          await new Promise((res) => setTimeout(res, 1000));
          return;
        }
      }
      // Option not yet visible — the list may still be loading. Record what
      // was visible for the timeout error message, then keep polling.
      lastVisibleLabels = await Promise.all(filtered.map((p) => p.getLabel()));
    } catch {
      // InputBox not ready yet — keep polling.
    }
    await new Promise((res) => setTimeout(res, 1000));
  }

  throw new Error(
    `Quick pick option "${option}" did not appear within ${timeoutMs} ms.` +
      (lastVisibleLabels.length
        ? ` Last visible: [${lastVisibleLabels.join(" | ")}]`
        : "")
  );
}

/** Returns a snapshot of the active terminal text without waiting. */
export async function readCurrentTerminalText(): Promise<string> {
  const panel = new BottomBarPanel();
  const terminalView = await panel.openTerminalView();
  return terminalView.getText();
}

/**
 * Debug toolbar buttons are often not visible: VS Code hides the floating bar
 * after the Run and Debug view takes focus. Commands do not need that bar.
 */
const DEBUG_ACTIONS = {
  continue: "workbench.action.debug.continue",
  stepOver: "workbench.action.debug.stepOver",
  pause: "workbench.action.debug.pause",
  restart: "workbench.action.debug.restart",
  stop: "workbench.action.debug.stop",
} as const;

export async function executeDebugAction(
  action: keyof typeof DEBUG_ACTIONS
): Promise<void> {
  await new Workbench().executeCommand(DEBUG_ACTIONS[action]);
}

/**
 * Opens `filePath` via Quick Open. `EditorView.openEditor()` only works on
 * already-open tabs, and Quick Open with an absolute path avoids same-named
 * files from the ESP-IDF tree.
 */
export async function openFileInEditor(filePath: string): Promise<TextEditor> {
  await new Workbench().executeCommand("workbench.action.quickOpen");
  const input = await InputBox.create(5000);
  await input.setText(filePath);
  await new Promise((res) => setTimeout(res, 1000));
  await input.confirm();
  await new Promise((res) => setTimeout(res, 1500));

  const fileName = filePath.split("/").pop() ?? filePath;
  return (await new EditorView().openEditor(fileName)) as TextEditor;
}

/**
 * Idempotent: any pre-existing breakpoint on that line is removed first.
 */
export async function setBreakpointInFile(
  filePath: string,
  lineNumber: number
): Promise<void> {
  const editor = await openFileInEditor(filePath);

  const existing = await editor.getBreakpoint(lineNumber);
  if (existing) {
    await existing.remove();
    await new Promise((res) => setTimeout(res, 500));
  }
  await editor.toggleBreakpoint(lineNumber);
  await new Promise((res) => setTimeout(res, 500));
}

export async function removeBreakpointInFile(
  filePath: string,
  lineNumber: number
): Promise<void> {
  const editor = await openFileInEditor(filePath);
  const existing = await editor.getBreakpoint(lineNumber);
  if (!existing) {
    return;
  }
  await existing.remove();
  await new Promise((res) => setTimeout(res, 1500));
}

/**
 * `getPausedBreakpoint()` reads the yellow-arrow gutter on a GDB halt.
 * It throws when 0 or >1 pause indicators are present — callers retry.
 */
async function pollPausedLine(
  filePath: string,
  timeoutMs: number,
  match: (line: number) => boolean
): Promise<number | undefined> {
  const fileName = filePath.split("/").pop() ?? filePath;
  try {
    await new EditorView().openEditor(fileName);
  } catch {
    await openFileInEditor(filePath);
  }
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const editor = (await new EditorView().openEditor(fileName)) as TextEditor;
      const paused = await editor.getPausedBreakpoint();
      if (paused) {
        const line = await paused.getLineNumber();
        if (match(line)) {
          return line;
        }
      }
    } catch {
      // Gutter has not settled on a single pause indicator yet.
    }
    await new Promise((res) => setTimeout(res, 1000));
  }

  return undefined;
}

/** Returns `undefined` if the pause indicator does not move within `timeoutMs`. */
export async function waitForPausedLineChange(
  filePath: string,
  previousLine: number,
  timeoutMs: number
): Promise<number | undefined> {
  return pollPausedLine(filePath, timeoutMs, (line) => line !== previousLine);
}

export async function waitForPausedLine(
  filePath: string,
  timeoutMs: number
): Promise<number> {
  const line = await pollPausedLine(filePath, timeoutMs, () => true);
  if (typeof line !== "number") {
    const fileName = filePath.split("/").pop() ?? filePath;
    throw new Error(`Timed out waiting for a pause indicator in ${fileName}.`);
  }
  return line;
}

export async function waitForPausedLineInRange(
  filePath: string,
  minLine: number,
  maxExclusive: number,
  timeoutMs: number
): Promise<number> {
  const line = await pollPausedLine(
    filePath,
    timeoutMs,
    (current) => current >= minLine && current < maxExclusive
  );
  if (typeof line !== "number") {
    const fileName = filePath.split("/").pop() ?? filePath;
    throw new Error(
      `Timed out waiting to pause in ${fileName} at lines ${minLine}–${
        maxExclusive - 1
      }.`
    );
  }
  return line;
}

export async function waitForPausedAtLine(
  filePath: string,
  expectedLine: number,
  timeoutMs: number
): Promise<number> {
  const line = await pollPausedLine(
    filePath,
    timeoutMs,
    (current) => current === expectedLine
  );
  if (typeof line !== "number") {
    const fileName = filePath.split("/").pop() ?? filePath;
    throw new Error(
      `Timed out waiting to pause at ${fileName}:${expectedLine}.`
    );
  }
  return line;
}

/**
 * After Continue with no remaining source breakpoint, GDB should leave this
 * file. Success = no pause indicator in `filePath` (the chip may still be
 * running in ROM/idle — Pause checks that separately).
 */
export async function waitForPauseIndicatorGone(
  filePath: string,
  timeoutMs: number
): Promise<void> {
  const fileName = filePath.split("/").pop() ?? filePath;
  try {
    await new EditorView().openEditor(fileName);
  } catch {
    await openFileInEditor(filePath);
  }
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const editor = (await new EditorView().openEditor(fileName)) as TextEditor;
      const paused = await editor.getPausedBreakpoint();
      if (!paused) {
        return;
      }
    } catch {
      return;
    }
    await new Promise((res) => setTimeout(res, 1000));
  }

  throw new Error(
    `Pause indicator was still present in ${fileName} after ${timeoutMs}ms.`
  );
}

/**
 * VS Code renders frames as visible text ("app_main  hello_world_main.c 11").
 * Unlike the Debug Console, the call stack updates after every GDB halt.
 */
export async function readCallStackSectionText(): Promise<string | undefined> {
  const debugControl = await new ActivityBar().getViewControl("Run and Debug");
  if (!debugControl) {
    return undefined;
  }
  const debugView = (await debugControl.openView()) as DebugView;
  const callStackSection = await debugView.getCallStackSection();
  return callStackSection.getText();
}

export async function readCallStackTopFrameLine(): Promise<number | undefined> {
  const rawText = await readCallStackSectionText();
  if (!rawText) {
    return undefined;
  }
  const m = rawText.match(/\.c[:\s]+(\d+)/);
  if (!m) {
    return undefined;
  }
  return parseInt(m[1], 10);
}

export async function waitForCallStackMatching(
  pattern: RegExp,
  timeoutMs: number
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let lastText = "";

  while (Date.now() < deadline) {
    lastText = (await readCallStackSectionText()) ?? "";
    if (pattern.test(lastText)) {
      return lastText;
    }
    await new Promise((res) => setTimeout(res, 1000));
  }

  throw new Error(
    `Timed out waiting for call stack to match ${pattern}.\nLast call stack:\n${lastText}`
  );
}

type VariableTreeItem = {
  getVariableName?: () => Promise<string>;
  getVariableValue?: () => Promise<string>;
  getLabel?: () => Promise<string>;
};

type VariablesSection = {
  expand?: () => Promise<unknown>;
  openItem: (...path: string[]) => Promise<unknown>;
  findItem: (label: string) => Promise<VariableTreeItem | undefined>;
  getText: () => Promise<string>;
  getVisibleItems?: () => Promise<VariableTreeItem[]>;
};

function localValueMatches(raw: string, expectedValue: number): boolean {
  const trimmed = raw.trim();
  if (trimmed === String(expectedValue)) {
    return true;
  }
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) && numeric === expectedValue;
}

function variablesTextHasValue(
  text: string,
  name: string,
  expectedValue: number
): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `\\b${escaped}\\b[^\\n]*=\\s*(?:0x)?0*${expectedValue}\\b`,
    "i"
  );
  const alt = new RegExp(
    `\\b${escaped}\\b\\s*:\\s*(?:0x)?0*${expectedValue}\\b`,
    "i"
  );
  return pattern.test(text) || alt.test(text);
}

async function readVariableValueFromTree(
  name: string
): Promise<{ value?: string; text: string }> {
  const debugControl = await new ActivityBar().getViewControl("Run and Debug");
  if (!debugControl) {
    return { text: "" };
  }
  const debugView = (await debugControl.openView()) as DebugView;
  const section = (await debugView.getVariablesSection()) as VariablesSection;
  try {
    await section.expand?.();
  } catch {
    // Pane may already be expanded.
  }
  for (const scope of ["Local", "Locals"]) {
    try {
      await section.openItem(scope);
    } catch {
      // CDT may use a different scope label, or locals are already top-level.
    }
  }

  const text = (await section.getText().catch(() => "")) ?? "";

  try {
    const item = await section.findItem(name);
    if (item?.getVariableValue) {
      return { value: await item.getVariableValue(), text };
    }
  } catch {
    // findItem throws when the tree has not populated yet.
  }

  if (section.getVisibleItems) {
    try {
      const items = await section.getVisibleItems();
      for (const item of items) {
        const label =
          (await item.getVariableName?.().catch(() => undefined)) ??
          (await item.getLabel?.().catch(() => undefined)) ??
          "";
        if (label === name || label.startsWith(`${name} `) || label.startsWith(`${name}:`) || label.startsWith(`${name}=`)) {
          if (item.getVariableValue) {
            return { value: await item.getVariableValue(), text };
          }
        }
      }
    } catch {
      // Visible-item scan is best-effort.
    }
  }

  return { text };
}

/**
 * Polls the Run and Debug VARIABLES tree until `name` equals `expectedValue`.
 * Accepts decimal or hex (GDB may show `1` or `0x1`).
 */
export async function waitForLocalVariable(
  name: string,
  expectedValue: number,
  timeoutMs: number
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let lastText = "";
  let lastValue = "";

  while (Date.now() < deadline) {
    const snapshot = await readVariableValueFromTree(name);
    lastText = snapshot.text;
    lastValue = snapshot.value ?? "";
    if (snapshot.value && localValueMatches(snapshot.value, expectedValue)) {
      return snapshot.value;
    }
    if (variablesTextHasValue(snapshot.text, name, expectedValue)) {
      return snapshot.text;
    }
    await new Promise((res) => setTimeout(res, 1000));
  }

  throw new Error(
    `Timed out waiting for local ${name} == ${expectedValue}.` +
      (lastValue ? `\nLast tree value: ${lastValue}` : "") +
      `\nVariables:\n${lastText}`
  );
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
 * Polls the named VS Code Output channel until `pattern` matches or the
 * timeout expires.  Used to detect long-running background operations that
 * write their completion status to an Output channel (e.g. idf.py set-target).
 */
export async function waitForOutputChannelText(
  channel: string,
  pattern: RegExp,
  timeoutMs: number
): Promise<string> {
  const panel = new BottomBarPanel();
  const outputView: OutputView = await panel.openOutputView();
  await outputView.selectChannel(channel);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const text = await outputView.getText();
    if (pattern.test(text)) {
      return text;
    }
    await new Promise((res) => setTimeout(res, 2000));
  }

  const text = await outputView.getText();
  throw new Error(
    `Timed out waiting for output channel "${channel}" to match ${pattern}.\nLast output:\n${text}`
  );
}

/**
 * Like `waitForTerminalOutput` but only matches text that is NEW since
 * `snapshot` was captured.  Pass `readCurrentTerminalText()` taken just before
 * issuing the action to avoid a false-positive match on pre-existing output.
 */
export async function waitForNewTerminalOutput(
  snapshot: string,
  pattern: RegExp,
  timeoutMs: number
): Promise<string> {
  const panel = new BottomBarPanel();
  const terminalView = await panel.openTerminalView();
  const deadline = Date.now() + timeoutMs;

  // Use the last 200 characters of the snapshot as an anchor instead of
  // slicing at snapshot.length.  This survives scrollback truncation (where
  // the leading part of the snapshot may have been dropped from the buffer)
  // and avoids scanning an arbitrarily large snapshot string on every poll.
  const anchor = snapshot.slice(-200);

  function newTextSince(full: string): string {
    const idx = full.lastIndexOf(anchor);
    return idx >= 0 ? full.slice(idx + anchor.length) : full;
  }

  while (Date.now() < deadline) {
    const full = await terminalView.getText();
    if (pattern.test(newTextSince(full))) {
      return full;
    }
    await new Promise((res) => setTimeout(res, 2000));
  }

  const full = await terminalView.getText();
  throw new Error(
    `Timed out waiting for NEW terminal output matching ${pattern}.\nNew text since snapshot:\n${newTextSince(full)}`
  );
}

/**
 * Force-terminates OpenOCD and GDB processes left behind by a debug session.
 *
 * Called from both the normal "stop" path inside the test AND from the suite's
 * `after` hook so that stale processes never block the next CI iteration.
 * `pkill -f` matches the full argv string, catching every chip-specific GDB
 * variant.  Exit code 1 ("no process matched") is silently swallowed.
 */
export async function killDebugProcesses(): Promise<void> {
  const patterns = [
    "openocd",
    "xtensa-esp.*-gdb",
    "riscv32-esp.*-gdb",
  ];
  await Promise.all(
    patterns.map((p) => execAsync(`pkill -f "${p}"`).catch(() => undefined))
  );
  await new Promise((res) => setTimeout(res, 1500));
}
