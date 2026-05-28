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
  By,
  EditorView,
  InputBox,
  WebView,
  Workbench,
} from "vscode-extension-tester";

const containerPath = resolve(__dirname, "..", "..", "testFiles");
const projectName = "testWorkspaceFlash";
const projectPath = resolve(containerPath, projectName);
const helloWorldBinPath = resolve(projectPath, "build", `${projectName}.bin`);
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

async function confirmProjectOverwriteIfNeeded(): Promise<void> {
  const notifications = await new Workbench().getNotifications();
  for (const notification of notifications) {
    const message = await notification.getMessage();
    if (message.includes("already exists")) {
      await notification.takeAction("Yes");
      await new Promise((res) => setTimeout(res, 2000));
      return;
    }
  }
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
  let view: WebView | undefined;

  before(async function () {
    this.timeout(120000);
    await dismissNotifications();
    await new Workbench().executeCommand("espIdf.newProject.start");
    const inputBox = await InputBox.create();
    await inputBox.selectQuickPick(0);
    await new Promise((res) => setTimeout(res, 2000));
    view = new WebView();
    await view.switchToFrame();
  });

  after(async () => {
    if (view) {
      await view.switchBack();
    }
    await new EditorView().closeAllEditors();
  });

  it("creates the hello_world example project", async () => {
    const espIdfSection = await view!.findWebElement(
      By.xpath(`.//div[@data-node-name='ESP-IDF Examples']`)
    );
    await espIdfSection.click();
    await new Promise((res) => setTimeout(res, 1000));

    const getStartedSection = await view!.findWebElement(
      By.xpath(`.//div[@data-node-name='get-started']`)
    );
    await getStartedSection.click();
    await new Promise((res) => setTimeout(res, 1000));

    const helloWorldExample = await view!.findWebElement(
      By.xpath(`.//div[@data-example-id='hello_world']`)
    );
    await helloWorldExample.click();
    await new Promise((res) => setTimeout(res, 3000));

    const chooseTemplateButton = await view!.findWebElement(
      By.id("chooseTemplateButton")
    );
    expect(await chooseTemplateButton.getText()).to.include(
      "Create project using template hello_world"
    );
    await chooseTemplateButton.click();
    await new Promise((res) => setTimeout(res, 2000));

    const projectDirInput = await view!.findWebElement(By.id("projectDirectory"));
    await projectDirInput.clear();
    await projectDirInput.sendKeys(containerPath);
    const projectNameInput = await view!.findWebElement(By.id("projectName"));
    await projectNameInput.clear();
    await projectNameInput.sendKeys(projectName);

    const createProjectButton = await view!.findWebElement(
      By.id("createProjectButton")
    );
    await createProjectButton.click();
    await confirmProjectOverwriteIfNeeded();
    await new Promise((res) => setTimeout(res, 15000));

    const openProjectButton = await view!.findWebElement(
      By.xpath(`//button[contains(.,'Open Project')]`)
    );
    await openProjectButton.click();
    await new Promise((res) => setTimeout(res, 8000));

    expect(await pathExists(projectPath)).to.be.true;
    expect(await pathExists(helloWorldBinPath)).to.be.false;
  }).timeout(120000);

  it("builds, configures UART flash, and flashes the project", async () => {
    if (view) {
      await view.switchBack();
      view = undefined;
    }
    await dismissNotifications();
    await new Promise((res) => setTimeout(res, 5000));

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
