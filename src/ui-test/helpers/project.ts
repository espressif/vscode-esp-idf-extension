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

import { pathExists } from "fs-extra";
import { basename, resolve } from "path";
import {
  BottomBarPanel,
  By,
  InputBox,
  OutputView,
  WebView,
  Workbench,
} from "vscode-extension-tester";

const BUILD_FAILURE_PATTERN =
  /ninja: build stopped|CMake Error|FAILED:|ninja: error|Compilation failed/i;

export const testWorkspaceDir = resolve(
  __dirname,
  "..",
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
  createComponent: "ESP-IDF: Create New ESP-IDF Component",
  doctor: "ESP-IDF: Doctor Command",
  menuconfig: "ESP-IDF: SDK Configuration Editor (Menuconfig)",
  selectPort: "ESP-IDF: Select Port to Use (COM, tty, usbserial)",
  selectMonitorPort:
    "ESP-IDF: Select Monitor Port to Use (COM, tty, usbserial)",
  selectFlashMethod: "ESP-IDF: Select Flash Method",
  setTarget: "ESP-IDF: Set Espressif Device Target",
  flash: "ESP-IDF: Flash Your Project",
  monitor: "ESP-IDF: Monitor Device",
  buildFlashMonitor:
    "ESP-IDF: Build, Flash and Start a Monitor on Your Device",
  openOcdManager: "ESP-IDF: OpenOCD Manager",
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

export async function ensureTestProjectOpen(): Promise<void> {
  if (await hasWorkbenchTitle(basename(testWorkspaceDir))) {
    return;
  }
  await openTestProject();
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

export async function findQuickPickByExactLabel(inputBox: InputBox, exactLabel: string) {
  const picks = await inputBox.getQuickPicks();
  for (const pick of picks) {
    if ((await pick.getLabel()) === exactLabel) {
      return pick;
    }
  }
  return undefined;
}

export async function listQuickPickLabels(inputBox: InputBox): Promise<string[]> {
  const picks = await inputBox.getQuickPicks();
  return Promise.all(picks.map((pick) => pick.getLabel()));
}

async function hasWorkbenchTitle(expectedTitleFragment: string): Promise<boolean> {
  try {
    const title = await new Workbench().getTitleBar().getTitle();
    return title.includes(expectedTitleFragment);
  } catch {
    return false;
  }
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

export async function switchToWebViewFrameContainingElement(
  locator: By,
  timeoutMs: number
): Promise<WebView> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    const view = new WebView();
    try {
      await view.switchToFrame(5000);
      await view.findWebElement(locator);
      return view;
    } catch (error) {
      lastError = error;
      try {
        await view.switchBack();
      } catch {}
      await new Promise((res) => setTimeout(res, 2000));
    }
  }

  const message = lastError instanceof Error ? lastError.message : lastError;
  throw new Error(
    `Timed out waiting for webview element ${locator}. Last error: ${message}`
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
