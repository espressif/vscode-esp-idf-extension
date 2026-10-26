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

import { execFile } from "child_process";
import { expect } from "chai";
import { promises as fs } from "fs";
import { basename, join } from "path";
import { Key, WebDriver } from "selenium-webdriver";
import {
  BottomBarPanel,
  By,
  EditorView,
  Workbench,
} from "vscode-extension-tester";
import {
  ESP_IDF_COMMANDS,
  clickStatusBarItem,
  dismissNotifications,
  ensureTestProjectOpen,
  executeEspIdfCommand,
  openFileInEditor,
  readActiveEspIdfVersion,
  readCurrentTerminalText,
  testWorkspaceDir,
} from "./ui-test-helpers";

/** Tooltip of the terminal icon on the ESP-IDF status bar. */
const IDF_TERMINAL_STATUS_BAR_LABEL = "Open ESP-IDF Terminal";

const ACTIVATION_COMPLETE = /Environment setup complete for the current shell session\.[\s\S]*You are now using IDF version\s+\d+\.\d+(?:\.\d+)?\./;

const ACTIVATION_VERSION = /You are now using IDF version\s+(\d+\.\d+(?:\.\d+)?)\./;

const IDF_PY_VERSION_LINE = /ESP-IDF\s+v?(\d+\.\d+(?:\.\d+)?)/;

const PROBLEM_LINE = /\b(?:error|warning|fatal|traceback)\b|command not found|virtual environment not found|no such file or directory|should be sourced, not executed/i;

const ACTIVATION_TIMEOUT_MS = 90000;
const TERMINAL_STABLE_MS = 2000;
const TERMINAL_READ_GAP_MS = 3000;
const SUBMIT_PROBE_WAIT_MS = 5000;
const FOCUS_TERMINAL_COMMAND = "Terminal: Focus Terminal";
const RUN_SELECTED_TEXT_COMMAND =
  "Terminal: Run Selected Text In Active Terminal";
const SEND_SEQUENCE_CHORD = "ctrl+alt+shift+enter";

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

function shellLine(marker: string): string {
  return `echo ${marker}; idf.py --version`;
}

function submitProbeFile(): string {
  return join(testWorkspaceDir, "idf-submit-probe.txt");
}

function extestKeybindingsFile(): string {
  const root = process.env.GITHUB_WORKSPACE || process.cwd();
  return join(root, "test-resources", "settings", "User", "keybindings.json");
}

function tail(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= 1200) {
    return trimmed;
  }
  return trimmed.slice(-1200);
}

function xdotool(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile("xdotool", args, { timeout: 8000 }, (error, _stdout, stderr) => {
      if (error) {
        reject(
          new Error(`${error.message}${stderr ? `\n${stderr}` : ""}`.trim())
        );
        return;
      }
      resolve();
    });
  });
}

async function dispatchKey(
  key: string,
  code: string,
  keyCode: number,
  modifiers = 0
): Promise<void> {
  const event = {
    key,
    code,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
    modifiers,
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

async function cancelInputLine(): Promise<void> {
  try {
    await focusTerminalByCommand();
  } catch {
    // A missed command leaves the palette open and would swallow the next keys.
    await chromeDriver()
      .actions()
      .sendKeys(Key.ESCAPE)
      .perform()
      .catch(() => undefined);
  }
  try {
    await xdotool(["key", "--clearmodifiers", "ctrl+c"]);
    await xdotool(["key", "--clearmodifiers", "ctrl+u"]);
  } catch {
    // xdotool may be missing. The browser key is the other clear attempt.
  }
  try {
    await dispatchKey("u", "KeyU", 85, 2);
  } catch {
    // Each submit probe reports its own input error.
  }
}

async function activeElementClass(): Promise<string> {
  return chromeDriver().executeScript<string>(`
    const el = document.activeElement;
    if (!el) {
      return "none";
    }
    return String(el.className || el.tagName);
  `);
}

async function revealTerminalInput(): Promise<void> {
  const ready = await chromeDriver().executeScript<string>(`
    const selectors = [
      ".terminal-wrapper.active .native-edit-context",
      ".xterm.focus .native-edit-context",
      ".xterm .native-edit-context",
      ".terminal-wrapper.active textarea",
      ".xterm textarea",
      "textarea.xterm-helper-textarea"
    ];
    let input = null;
    for (const selector of selectors) {
      input = document.querySelector(selector);
      if (input) {
        break;
      }
    }
    if (!input) {
      return "missing";
    }
    input.id = "idf-ui-terminal-input";
    input.setAttribute("data-idf-ui-style", input.getAttribute("style") || "");
    input.style.position = "fixed";
    input.style.left = "24px";
    input.style.top = "120px";
    input.style.width = "220px";
    input.style.height = "32px";
    input.style.opacity = "1";
    input.style.zIndex = "2147483647";
    input.style.pointerEvents = "auto";
    input.removeAttribute("readonly");
    input.removeAttribute("aria-hidden");
    input.focus();
    return "ready";
  `);
  if (ready !== "ready") {
    throw new Error("Terminal input element was not found");
  }
}

async function restoreTerminalInputStyle(): Promise<void> {
  await chromeDriver()
    .executeScript(
      `
      const input = document.getElementById("idf-ui-terminal-input");
      if (!input) {
        return;
      }
      input.setAttribute("style", input.getAttribute("data-idf-ui-style") || "");
      input.removeAttribute("data-idf-ui-style");
      input.removeAttribute("id");
    `
    )
    .catch(() => undefined);
}

async function submitByFocusAndBrowserEnter(marker: string): Promise<string> {
  await pasteIntoActiveTerminal(shellLine(marker));
  await delay(300);
  await focusTerminalByCommand();
  const active = await activeElementClass();
  await dispatchKey("Enter", "Enter", 13);
  return `activeElement=${active}`;
}

async function submitByVisibleSendKeys(marker: string): Promise<string> {
  await pasteIntoActiveTerminal(shellLine(marker));
  await delay(300);
  try {
    await revealTerminalInput();
    const input = await chromeDriver().findElement(
      By.id("idf-ui-terminal-input")
    );
    await input.click();
    await input.sendKeys(Key.ENTER);
  } finally {
    await restoreTerminalInputStyle();
  }
  return "";
}

async function submitByXdotool(marker: string): Promise<string> {
  await pasteIntoActiveTerminal(shellLine(marker));
  await delay(300);
  await focusTerminalByCommand();
  const title = basename(testWorkspaceDir);
  let activateNote = "windowactivate=ok";
  try {
    await xdotool(["search", "--name", title, "windowactivate", "--sync"]);
  } catch (error) {
    activateNote = `windowactivate=${
      error instanceof Error ? error.message : String(error)
    }`;
  }
  await xdotool(["key", "--clearmodifiers", "Return"]);
  return `DISPLAY=${process.env.DISPLAY ?? "unset"} ${activateNote}`;
}

async function submitBySendSequence(marker: string): Promise<string> {
  const file = extestKeybindingsFile();
  let previous = "";
  try {
    previous = await fs.readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
  await fs.writeFile(
    file,
    JSON.stringify(
      [
        {
          key: SEND_SEQUENCE_CHORD,
          command: "workbench.action.terminal.sendSequence",
          args: { text: `${shellLine(marker)}\r` },
        },
      ],
      null,
      2
    )
  );
  try {
    await delay(2000);
    await waitUntilCommandPaletteClosed();
    await chromeDriver()
      .actions()
      .keyDown(Key.CONTROL)
      .keyDown(Key.ALT)
      .keyDown(Key.SHIFT)
      .sendKeys(Key.ENTER)
      .keyUp(Key.SHIFT)
      .keyUp(Key.ALT)
      .keyUp(Key.CONTROL)
      .perform();
  } finally {
    if (previous.length > 0) {
      await fs.writeFile(file, previous);
    } else {
      await fs.rm(file, { force: true });
    }
  }
  return file;
}

async function submitByRunSelectedText(marker: string): Promise<string> {
  const file = submitProbeFile();
  await fs.writeFile(file, `${shellLine(marker)}\n`);
  try {
    const editor = await openFileInEditor(file);
    const editorText = await editor.getText();
    if (!editorText.includes(marker)) {
      throw new Error(
        `Probe editor did not show ${marker}.\n${editorText.slice(0, 500)}`
      );
    }
    await executeEspIdfCommand(RUN_SELECTED_TEXT_COMMAND);
    await waitUntilCommandPaletteClosed();
  } finally {
    await new EditorView().closeEditor(basename(file)).catch(() => undefined);
    await fs.rm(file, { force: true });
  }
  return file;
}

type ProbeResult = {
  name: string;
  passed: boolean;
  detail: string;
};

async function runSubmitProbe(
  name: string,
  marker: string,
  activeVersion: string,
  attempt: () => Promise<string>
): Promise<ProbeResult> {
  await cancelInputLine();
  await delay(400);
  let snapshot = "";
  try {
    snapshot = await readTerminalText();
  } catch {
    snapshot = "";
  }
  terminalSnapshot = snapshot;
  try {
    const note = await attempt();
    await delay(SUBMIT_PROBE_WAIT_MS);
    const fresh = textAfterSnapshot(await readTerminalText(), snapshot);
    const executed = fresh.split("\n").some((line) => line.trim() === marker);
    const reported = fresh.match(IDF_PY_VERSION_LINE)?.[1];
    const versionOk = reported
      ? sameIdfVersion(activeVersion, reported)
      : false;
    const problems = fresh
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && PROBLEM_LINE.test(line));
    const passed = executed && versionOk && problems.length === 0;
    const detail = [
      note,
      `executed=${executed}`,
      `version=${reported ?? "none"}`,
      `match=${versionOk}`,
      problems.length > 0 ? `problems=${problems.join(" | ")}` : "",
      tail(fresh),
    ]
      .filter((bit) => bit.length > 0)
      .join("\n");
    return { name, passed, detail };
  } catch (error) {
    return {
      name,
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * One open ESP-IDF terminal tries every submit path.
 * A path passes when its echo marker is printed as its own line and
 * idf.py --version matches the status bar.
 */
async function probeIdfPySubmitMethods(where: string): Promise<void> {
  const activeVersion = await waitForActiveEspIdfVersion();
  console.log(
    `${where} submit probe, status bar ${activeVersion}, DISPLAY=${
      process.env.DISPLAY ?? "unset"
    }`
  );
  const methods: Array<{
    name: string;
    marker: string;
    run: (marker: string) => Promise<string>;
  }> = [
    {
      name: "1 focus terminal + browser Enter",
      marker: "IDF_TRY_FOCUS_ENTER",
      run: submitByFocusAndBrowserEnter,
    },
    {
      name: "2 visible field + selenium Enter",
      marker: "IDF_TRY_VISIBLE_SENDKEYS",
      run: submitByVisibleSendKeys,
    },
    {
      name: "3 xdotool Return",
      marker: "IDF_TRY_XDOTOOL",
      run: submitByXdotool,
    },
    {
      name: "4 sendSequence keybinding",
      marker: "IDF_TRY_SEND_SEQUENCE",
      run: submitBySendSequence,
    },
    {
      name: "5 run selected text",
      marker: "IDF_TRY_RUN_SELECTED",
      run: submitByRunSelectedText,
    },
  ];
  const results: ProbeResult[] = [];
  try {
    for (const method of methods) {
      const result = await runSubmitProbe(
        method.name,
        method.marker,
        activeVersion,
        () => method.run(method.marker)
      );
      results.push(result);
      console.log(
        `SUBMIT_PROBE ${result.passed ? "PASS" : "FAIL"} ${result.name}\n${
          result.detail
        }`
      );
    }
  } finally {
    await restoreTerminalInputStyle();
    await fs.rm(submitProbeFile(), { force: true }).catch(() => undefined);
    await fs
      .rm(extestKeybindingsFile(), { force: true })
      .catch(() => undefined);
  }
  const summary = results
    .map((result) => `${result.passed ? "PASS" : "FAIL"}  ${result.name}`)
    .join("\n");
  console.log(`SUBMIT_PROBE summary\n${summary}`);
  if (!results.some((result) => result.passed)) {
    throw new Error(
      `No submit method ran idf.py --version.\n${summary}\n\n${results
        .map((result) => `${result.name}\n${result.detail}`)
        .join("\n---\n")}`
    );
  }
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

      step("Try five ways to run idf.py --version", async () => {
        await probeIdfPySubmitMethods("Command palette");
      });

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

      step("Close the status bar ESP-IDF terminal", async () => {
        await closeActiveTerminal();
      });
    }
  );
});
