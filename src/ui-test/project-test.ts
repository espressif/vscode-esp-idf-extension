/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 3rd December 2021 2:56:28 pm
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

import { expect } from "chai";
import { pathExists } from "fs-extra";
import { resolve } from "path";
import { By, InputBox, WebView, Workbench } from "vscode-extension-tester";

describe("Example Create testing", async () => {
  let view: WebView;

  before(async function () {
    this.timeout(10000);
    await new Workbench().executeCommand("espIdf.newProject.start");
    const inputBox = await InputBox.create();
    await inputBox.selectQuickPick(0);
    await new Promise((res) => setTimeout(res, 2000));
    view = new WebView();
    await view.switchToFrame();
  });

  it("Create the blink example", async () => {
    const containerPath = resolve(__dirname, "..", "..", "testFiles");
    const projectName = "testBlink";
    const resultBlinkPath = resolve(containerPath, projectName);
    const projectDirInput = await view.findWebElement(
      By.id("projectDirectory")
    );
    await projectDirInput.clear();
    await projectDirInput.sendKeys(containerPath);
    const projectNameInput = await view.findWebElement(By.id("projectName"));
    await projectNameInput.clear();
    await projectNameInput.sendKeys(projectName);

    const exampleSelect = await view.findWebElement(By.id("choose-template"));
    await exampleSelect.click();
    await new Promise((res) => setTimeout(res, 2000));

    const exampleElement = await view.findWebElement(
      By.xpath(`.//div[@data-example-id='blink']`)
    );
    await exampleElement.click();
    await new Promise((res) => setTimeout(res, 1000));
    const createProjectButton = await view.findWebElement(
      By.id("createProjectButton")
    );
    expect(await createProjectButton.getText()).has.string(
      "Create project using template blink"
    );

    await createProjectButton.click();
    await new Promise((res) => setTimeout(res, 5000));
    const resultBlinkPathExists = await pathExists(resultBlinkPath);
    expect(resultBlinkPathExists).to.be.true;
  }).timeout(20000);

  it("Create a test component", async function () {
    this.timeout(12000);
    await new Promise((res) => setTimeout(res, 1000));
    await openTestProject();
    await new Promise((res) => setTimeout(res, 5000));
    await new Workbench().executeCommand("espIdf.createNewComponent");
    await new Promise((res) => setTimeout(res, 1000));
    const inputBox = await InputBox.create();
    const componentName = "testComponent";
    await inputBox.setText(componentName);
    await inputBox.confirm();
    const projectName = "testBlink";
    const componentPath = resolve(
      __dirname,
      "..",
      "..",
      "testFiles",
      projectName,
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
  });
});

export async function openTestProject() {
  await new Promise((res) => setTimeout(res, 5000));
  await new Workbench().executeCommand("file: open folder");
  const projectName = "testBlink";
  const testWorkspaceDir = resolve(
    __dirname,
    "..",
    "..",
    "testFiles",
    projectName
  );
  await new Promise((res) => setTimeout(res, 1000));
  const input = await InputBox.create();
  await input.setText(testWorkspaceDir);
  await input.confirm();
  await new Promise((res) => setTimeout(res, 4000));
}
