/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 26th October 2026
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
import { WebDriver } from "selenium-webdriver";
import { BottomBarPanel, Workbench } from "vscode-extension-tester";
import {
  ESP_IDF_COMMANDS,
  clickStatusBarItem,
  dismissNotifications,
  ensureTestProjectOpen,
  executeEspIdfCommand,
  readActiveEspIdfVersion,
  readCurrentTerminalText,
} from "./ui-test-helpers";

/** Tooltip of the terminal icon on the ESP-IDF status bar. */
const IDF_TERMINAL_STATUS_BAR_LABEL = "Open ESP-IDF Terminal";

const ACTIVATION_COMPLETE = /Environment setup complete for the current shell session\.[\s\S]*You are now using IDF version\s+\d+\.\d+(?:\.\d+)?\./;

const ACTIVATION_VERSION = /You are now using IDF version\s+(\d+\.\d+(?:\.\d+)?)\./;

const IDF_PY_VERSION_LINE = /ESP-IDF\s+v?(\d+\.\d+(?:\.\d+)?)/;

const PROBLEM_LINE = /\b(?:error|warning|fatal|traceback)\b|command not found|virtual environment not found|no such file or directory|should be sourced, not executed/i;

const ACTIVATION_TIMEOUT_MS = 90000;
const IDF_PY_TIMEOUT_MS = 60000;
const TERMINAL_STABLE_MS = 2000;
const TERMINAL_READ_GAP_MS = 3000;
const IDF_PY_BEFORE_READ_MS = 3000;
const FOCUS_TERMINAL_COMMAND = "Terminal: Focus Terminal";

type IdfVersionParts = {
  major: number;
  minor: number;
  patch?: number;
};

let skipRemainingSteps = false;
let terminalSnapshot = "";

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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripTerminalText(value: string): string {
  return value.replace(/\u001b\[[0-9;]*m/g, "").replace(/\r/g, "");
}

/**
 * Status bar and the activation script use version.cmake (`6.1.0`).
 * `idf.py --version` prints `git describe`, which is `v6.1` when the release
 * tag has no patch. A missing patch agrees only with patch 0.
 */
function parseIdfVersion(value: string): IdfVersionParts | undefined {
  const match = value.match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!match) {
    return undefined;
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: match[3] === undefined ? undefined : Number(match[3]),
  };
}

function sameIdfVersion(active: string, reported: string): boolean {
  const left = parseIdfVersion(active);
  const right = parseIdfVersion(reported);
  if (!left || !right) {
    return false;
  }
  if (left.major !== right.major || left.minor !== right.minor) {
    return false;
  }
  if (left.patch === undefined || right.patch === undefined) {
    const present = left.patch ?? right.patch;
    return present === undefined || present === 0;
  }
  return left.patch === right.patch;
}

function assertSameIdfVersion(
  active: string,
  reported: string,
  where: string
): void {
  expect(
    sameIdfVersion(active, reported),
    `${where}: active ESP-IDF ${active}, terminal reported ${reported}`
  ).to.equal(true);
}

function assertNoProblems(text: string, where: string): void {
  const problems = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && PROBLEM_LINE.test(line));
  if (problems.length > 0) {
    throw new Error(
      `${where} reported problems:\n${problems.join(
        "\n"
      )}\n\nFull output:\n${text}`
    );
  }
}

function textAfterSnapshot(full: string, snapshot: string): string {
  if (!snapshot) {
    return full;
  }
  const anchor = snapshot.slice(-200);
  const index = full.lastIndexOf(anchor);
  return index >= 0 ? full.slice(index + anchor.length) : full;
}

async function readTerminalText(): Promise<string> {
  return stripTerminalText(await readCurrentTerminalText());
}

async function rememberTerminalSnapshot(): Promise<void> {
  try {
    terminalSnapshot = await readTerminalText();
  } catch {
    terminalSnapshot = "";
  }
}

async function waitForActiveEspIdfVersion(): Promise<string> {
  const deadline = Date.now() + 30000;
  let lastError = "Active ESP-IDF version was not found on the status bar.";
  while (Date.now() < deadline) {
    try {
      return await readActiveEspIdfVersion();
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      await delay(1000);
    }
  }
  throw new Error(lastError);
}

/**
 * `TerminalView.getText()` opens the command palette (`Terminal: Select All`)
 * on every call. Read twice, with a gap, instead of polling every second.
 */
async function waitForStableNewTerminalText(
  pattern: RegExp,
  timeoutMs: number,
  what: string,
  readImmediately = false
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let latestFresh = "";
  let skipDelay = readImmediately;

  while (Date.now() < deadline) {
    if (skipDelay) {
      skipDelay = false;
    } else {
      await delay(TERMINAL_READ_GAP_MS);
    }
    let full = "";
    try {
      full = await readTerminalText();
    } catch {
      continue;
    }
    const fresh = textAfterSnapshot(full, terminalSnapshot);
    latestFresh = fresh;
    if (!pattern.test(fresh)) {
      continue;
    }
    await delay(TERMINAL_STABLE_MS);
    try {
      full = await readTerminalText();
    } catch {
      continue;
    }
    const settled = textAfterSnapshot(full, terminalSnapshot);
    latestFresh = settled;
    if (pattern.test(settled) && settled === fresh) {
      return settled;
    }
  }

  throw new Error(
    `Timed out waiting for ${what}.\nNew terminal text:\n${latestFresh}`
  );
}

type SyncClipboard = {
  readSync: () => string;
  writeSync: (value: string) => void;
};

type ChromeDriver = WebDriver & {
  sendDevToolsCommand(
    command: string,
    params?: Record<string, unknown>
  ): Promise<unknown>;
};

/**
 * Paste does not submit the line. Enter is sent as a browser key event
 * because the terminal input element rejects Selenium sendKeys.
 */
async function pasteIntoActiveTerminal(command: string): Promise<void> {
  const clipboard = (await import("clipboardy")).default as SyncClipboard;
  let original = "";
  try {
    original = clipboard.readSync();
  } catch {
    original = "";
  }
  clipboard.writeSync(command);
  try {
    await new Workbench().executeCommand(
      "Terminal: Paste into Active Terminal"
    );
  } finally {
    if (original.length > 0) {
      clipboard.writeSync(original);
    }
  }
}

function chromeDriver(): ChromeDriver {
  return new Workbench().getDriver() as ChromeDriver;
}

async function waitUntilCommandPaletteClosed(): Promise<void> {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const open = await chromeDriver().executeScript<boolean>(`
      const widget = document.querySelector(".quick-input-widget");
      if (!widget) {
        return false;
      }
      const style = window.getComputedStyle(widget);
      return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
    `);
    if (!open) {
      return;
    }
    await delay(100);
  }
}

async function focusTerminalByCommand(): Promise<void> {
  await executeEspIdfCommand(FOCUS_TERMINAL_COMMAND);
  await waitUntilCommandPaletteClosed();
}

async function pressEnterInTerminal(): Promise<void> {
  const event = {
    key: "Enter",
    code: "Enter",
    windowsVirtualKeyCode: 13,
    nativeVirtualKeyCode: 13,
  };
  await chromeDriver().sendDevToolsCommand("Input.dispatchKeyEvent", {
    type: "keyDown",
    ...event,
  });
  await chromeDriver().sendDevToolsCommand("Input.dispatchKeyEvent", {
    type: "keyUp",
    ...event,
  });
}

async function closeActiveTerminal(): Promise<void> {
  let text = "";
  let terminalView;
  try {
    terminalView = await new BottomBarPanel().openTerminalView();
    text = await terminalView.getText();
  } catch {
    return;
  }
  if (!text.trim()) {
    return;
  }
  await terminalView.killTerminal();
  await delay(1500);
}

async function assertActivationMatchesActiveVersion(
  where: string
): Promise<void> {
  const activeVersion = await waitForActiveEspIdfVersion();
  console.log(`${where} status bar ESP-IDF version: ${activeVersion}`);
  const output = await waitForStableNewTerminalText(
    ACTIVATION_COMPLETE,
    ACTIVATION_TIMEOUT_MS,
    `${where} ESP-IDF activation`
  );
  console.log(output);
  assertNoProblems(output, `${where} activation`);
  const reported = output.match(ACTIVATION_VERSION)?.[1];
  if (!reported) {
    throw new Error(
      `${where} activation did not report an IDF version.\n${output}`
    );
  }
  assertSameIdfVersion(activeVersion, reported, `${where} activation`);
}

async function assertIdfPyVersionMatchesActiveVersion(
  where: string
): Promise<void> {
  const activeVersion = await waitForActiveEspIdfVersion();
  await new BottomBarPanel().openTerminalView();
  terminalSnapshot = await readTerminalText();
  await pasteIntoActiveTerminal("idf.py --version");
  await focusTerminalByCommand();
  await pressEnterInTerminal();
  await delay(IDF_PY_BEFORE_READ_MS);
  const output = await waitForStableNewTerminalText(
    IDF_PY_VERSION_LINE,
    IDF_PY_TIMEOUT_MS,
    `${where} idf.py --version`,
    true
  );
  console.log(output);
  assertNoProblems(output, `${where} idf.py --version`);
  const reported = output.match(IDF_PY_VERSION_LINE)?.[1];
  if (!reported) {
    throw new Error(
      `${where} idf.py --version did not report a version.\n${output}`
    );
  }
  assertSameIdfVersion(activeVersion, reported, `${where} idf.py --version`);
}

describe("ESP-IDF terminal", () => {
  before(async function () {
    this.timeout(120000);
    await dismissNotifications();
    await ensureTestProjectOpen();
  });

  after(async function () {
    this.timeout(30000);
    await closeActiveTerminal();
    await new BottomBarPanel().toggle(false).catch(() => undefined);
  });

  scenario(
    "opens from the command palette and activates the selected ESP-IDF",
    () => {
      step("Open ESP-IDF terminal from the command palette", async () => {
        await rememberTerminalSnapshot();
        await executeEspIdfCommand(ESP_IDF_COMMANDS.openIdfTerminal);
      });

      step(
        "Command palette activation matches the active ESP-IDF version",
        async () => {
          await assertActivationMatchesActiveVersion("Command palette");
        }
      );

      step(
        "Command palette idf.py --version matches the active ESP-IDF version",
        async () => {
          await assertIdfPyVersionMatchesActiveVersion("Command palette");
        }
      );

      step("Close the ESP-IDF terminal", async () => {
        await closeActiveTerminal();
      });
    }
  );

  scenario(
    "opens from the status bar and activates the selected ESP-IDF",
    () => {
      step(
        "Close a terminal left open by the command palette flow",
        async () => {
          await closeActiveTerminal();
        }
      );

      step("Open ESP-IDF terminal from the status bar", async () => {
        await dismissNotifications();
        await rememberTerminalSnapshot();
        await clickStatusBarItem(IDF_TERMINAL_STATUS_BAR_LABEL);
      });

      step(
        "Status bar activation matches the active ESP-IDF version",
        async () => {
          await assertActivationMatchesActiveVersion("Status bar");
        }
      );

      step(
        "Status bar idf.py --version matches the active ESP-IDF version",
        async () => {
          await assertIdfPyVersionMatchesActiveVersion("Status bar");
        }
      );

      step("Close the status bar ESP-IDF terminal", async () => {
        await closeActiveTerminal();
      });
    }
  );
});
