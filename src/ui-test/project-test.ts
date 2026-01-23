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
import {
  By,
  EditorView,
  InputBox,
  WebView,
  Workbench,
} from "vscode-extension-tester";

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

    const espIdfSection = await view.findWebElement(
      By.xpath(`.//div[@data-node-name='ESP-IDF']`)
    );
    await espIdfSection.click();

    await new Promise((res) => setTimeout(res, 1000));

    const getStartedSection = await view.findWebElement(
      By.xpath(`.//div[@data-node-name='get-started']`)
    );
    await getStartedSection.click();

    await new Promise((res) => setTimeout(res, 1000));

    const blinkExample = await view.findWebElement(
      By.xpath(`.//div[@data-example-id='blink']`)
    );
    await blinkExample.click();
    await new Promise((res) => setTimeout(res, 3000));
    const createProjectButton = await view.findWebElement(
      By.id("createProjectButton")
    );
    expect(await createProjectButton.getText()).has.string(
      "Create project using template blink"
    );

    await createProjectButton.click();
    await new Promise((res) => setTimeout(res, 2000));

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

    await new Promise((res) => setTimeout(res, 7000));
    const resultBlinkPathExists = await pathExists(resultBlinkPath);
    expect(resultBlinkPathExists).to.be.true;
    if (view) {
      await view.switchBack();
    }
    await new EditorView().closeAllEditors();
  }).timeout(20000);
});
