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

import { BottomBarPanel, EditorView, InputBox, Workbench } from "vscode-extension-tester";
import { expect } from "chai";
import { resolve } from "path";
import { pathExists } from "fs-extra";

describe("Build testing", async () => {
  let panel: BottomBarPanel;

  before(async function () {
    this.timeout(100000);
    await openTestProject();
  });

  it("Log Doctor command configuration", async () => {
     await new Promise((res) => setTimeout(res, 3000));
     await new Workbench().executeCommand("ESP-IDF: Doctor Command");
     await new Promise((res) => setTimeout(res, 10000));
     const editorView = new EditorView();
     const editor = await editorView.openEditor("report.txt");
     const docCmdText = await editor.getText();
     console.log(docCmdText);
   }).timeout(999999);

  it("Build bin is generated", async () => {
    await new Workbench().executeCommand("ESP-IDF: Build your Project");
    await new Promise((res) => setTimeout(res, 5000));
    // get names of all available terminals
    await new Promise((res) => setTimeout(res, 2000));
    await new Promise((res) => setTimeout(res, 150000));
    panel = new BottomBarPanel();
    const terminalView = await panel.openTerminalView();
    const names = await terminalView.getChannelNames();
    console.log(names);
    // await terminalView.selectChannel();
    const text = await terminalView.getText();
    console.log(text);
    const testBinPath = resolve(
      __dirname,
      "..",
      "..",
      "testFiles",
      "testWorkspace",
      "build",
      "hello-world.bin"
    );
    const binExists = await pathExists(testBinPath);
    expect(binExists).to.be.true;
  }).timeout(999999);

  it("Create a test component", async function () {
    await new Promise((res) => setTimeout(res, 3000));
    await new Workbench().executeCommand("espIdf.createNewComponent");
    await new Promise((res) => setTimeout(res, 8000));
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

export async function openTestProject() {
  await new Promise((res) => setTimeout(res, 5000));
  await new Workbench().executeCommand("file: open folder");
  const testWorkspaceDir = resolve(
    __dirname,
    "..",
    "..",
    "testFiles",
    "testWorkspace"
  );
  await new Promise((res) => setTimeout(res, 1000));
  const input = await InputBox.create();
  await input.setText(testWorkspaceDir);
  await input.confirm();
  await new Promise((res) => setTimeout(res, 4000));
}
