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
import { pathExists } from "fs-extra";
import { resolve } from "path";
import {
  BottomBarPanel,
  InputBox,
  Workbench,
} from "vscode-extension-tester";
import { openTestProject, testWorkspaceDir } from "./ui-test-helpers";

const helloWorldBinPath = resolve(
  testWorkspaceDir,
  "build",
  "hello-world.bin"
);
const serialPort = process.env.IDF_UI_TEST_SERIAL_PORT ?? "/dev/ttyUSB1";

const FLASH_SUCCESS_PATTERN =
  /Hash of data verified|Flash Done|Hard resetting via RTS pin/;

async function dismissNotifications(): Promise<void> {
  const notifications = await new Workbench().getNotifications();
  for (const notification of notifications) {
    await notification.dismiss();
  }
}

async function selectQuickPickOption(
  command: string,
  option: string | number
): Promise<void> {
  await new Workbench().executeCommand(command);
  await new Promise((res) => setTimeout(res, 2000));
  const inputBox = await InputBox.create();
  await inputBox.selectQuickPick(option);
  await new Promise((res) => setTimeout(res, 1000));
}

async function waitForTerminalOutput(
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

describe("Flash testing", () => {
  before(async function () {
    this.timeout(100000);
    await dismissNotifications();
    await openTestProject();
  });

  it("builds, configures UART flash, and flashes testWorkspace", async () => {
    await new Promise((res) => setTimeout(res, 3000));
    await new Workbench().executeCommand("ESP-IDF: Full Clean Project");
    await new Promise((res) => setTimeout(res, 10000));
    await new Workbench().executeCommand("ESP-IDF: Build your Project");
    await new Promise((res) => setTimeout(res, 150000));

    expect(await pathExists(helloWorldBinPath)).to.be.true;

    await selectQuickPickOption("espIdf.selectPort", serialPort);
    await selectQuickPickOption("espIdf.selectFlashMethodAndFlash", "UART");

    await new Workbench().executeCommand("espIdf.flashDevice");
    const terminalOutput = await waitForTerminalOutput(
      FLASH_SUCCESS_PATTERN,
      180000
    );
    console.log(terminalOutput);
    expect(FLASH_SUCCESS_PATTERN.test(terminalOutput)).to.be.true;
  }).timeout(999999);
});
