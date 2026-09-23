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

import {
  ActivityBar,
  DebugView,
  EditorView,
  InputBox,
  TextEditor,
  Workbench,
} from "vscode-extension-tester";
import { delay, logDebugSession } from "./debug-session";

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
    await editor.toggleBreakpoint(lineNumber);
    await delay(500);
  }
  await editor.toggleBreakpoint(lineNumber);
  await delay(500);
}

/** Command-based: avoids Selenium waiting for a gutter glyph to go stale. */
export async function removeAllBreakpoints(): Promise<void> {
  logDebugSession("Removing all breakpoints via workbench.debug.viewlet.action.removeAllBreakpoints");
  await new Workbench().executeCommand(
    "workbench.debug.viewlet.action.removeAllBreakpoints"
  );
  await delay(2000);
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
  await editor.toggleBreakpoint(lineNumber);
  await delay(1500);
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
          logDebugSession(`Pause indicator at ${fileName}:${line} (match)`);
          return line;
        }
        logDebugSession(
          `Pause indicator at ${fileName}:${line} (waiting for expected line)`
        );
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
  try {
    const debugControl = await new ActivityBar().getViewControl("Run and Debug");
    if (!debugControl) {
      return undefined;
    }
    const debugView = (await debugControl.openView()) as DebugView;
    const callStackSection = await debugView.getCallStackSection();
    return callStackSection.getText();
  } catch {
    return undefined;
  }
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
    try {
      lastText = (await readCallStackSectionText()) ?? "";
      if (pattern.test(lastText)) {
        return lastText;
      }
    } catch {
      // Call stack pane may not be ready yet (default 5s locator).
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
