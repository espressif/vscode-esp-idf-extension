/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 26th November 2021 6:57:17 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
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
  BottomBarPanel,
  EditorView,
  InputBox,
} from "vscode-extension-tester";
import { expect } from "chai";
import { resolve } from "path";
import { pathExists } from "fs-extra";
import {
  dismissNotifications,
  ESP_IDF_COMMANDS,
  executeEspIdfCommand,
  helloWorldBinPath,
  openTestProject,
  waitForBuildComplete,
  waitForPathAbsent,
} from "./ui-test-helpers";

describe("Build testing", async () => {
  let panel: BottomBarPanel;

  before(async function () {
    this.timeout(100000);
    await dismissNotifications();
    await openTestProject();
  });

  it("Log Doctor command configuration", async () => {
    await new Promise((res) => setTimeout(res, 3000));
    await executeEspIdfCommand(ESP_IDF_COMMANDS.doctor);
    await new Promise((res) => setTimeout(res, 10000));
    const editorView = new EditorView();
    const editor = await editorView.openEditor("report.txt");
    const docCmdText = await editor.getText();
    console.log(docCmdText);
  }).timeout(999999);

  it("Build bin is generated", async () => {
    await executeEspIdfCommand(ESP_IDF_COMMANDS.fullClean);
    await waitForPathAbsent(helloWorldBinPath, 60000);
    await executeEspIdfCommand(ESP_IDF_COMMANDS.build);
    await waitForBuildComplete(helloWorldBinPath, 300000);
    panel = new BottomBarPanel();
    const terminalView = await panel.openTerminalView();
    const names = await terminalView.getChannelNames();
    console.log(names);
    // await terminalView.selectChannel();
    const text = await terminalView.getText();
    console.log(text);
    const binExists = await pathExists(helloWorldBinPath);
    expect(binExists).to.be.true;
  }).timeout(999999);

  it("Create a test component", async function () {
    await new Promise((res) => setTimeout(res, 3000));
    await executeEspIdfCommand(ESP_IDF_COMMANDS.createComponent);
    const inputBox = await InputBox.create();
    const componentName = "testComponent";
    await inputBox.setText(componentName);
    await inputBox.confirm();
    const componentPath = resolve(
      __dirname,
      "..",
      "..",
      "testFiles",
      "testWorkspace",
      "components",
      componentName
    );
    await new Promise((res) => setTimeout(res, 3000));
    const componentPathExists = await pathExists(componentPath);
    expect(componentPathExists).to.be.true;
    const componentSrcPathExists = await pathExists(
      resolve(componentPath, `${componentName}.c`)
    );
    expect(componentSrcPathExists).to.be.true;
  }).timeout(999999);
});
