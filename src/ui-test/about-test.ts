/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 17th December 2021 2:20:05 pm
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
import { join } from "path";
import { By, EditorView, WebView, Workbench } from "vscode-extension-tester";

describe("Configure extension", () => {
  let view: WebView;

  before(async function () {
    this.timeout(100000);
    await new Promise((res) => setTimeout(res, 2000));
    await new Workbench().executeCommand("espIdf.setup.start");
    await new Promise((res) => setTimeout(res, 12000));
    view = new WebView();
    await view.switchToFrame();
  });

  // after(async () => {
  //   if (view) {
  //     await view.switchBack();
  //   }
  //   await new EditorView().closeAllEditors();
  // });

  it("Find install options", async () => {
    const expressElement = await view.findWebElement(
      By.xpath(`.//label[@data-config-id='express']`)
    );
    expect(await expressElement.getText()).has.string("EXPRESS");

    const advancedElement = await view.findWebElement(
      By.xpath(`.//label[@data-config-id='advanced']`)
    );
    expect(await advancedElement.getText()).has.string("ADVANCED");

    const existingElement = await view.findWebElement(
      By.xpath(`.//label[@data-config-id='existing-setup']`)
    );
    expect(await existingElement.getText()).has.string("USE EXISTING SETUP");
  });

  it("Configure using Express", async () => {
    const expressElement = await view.findWebElement(
      By.id("express-install-btn")
    );
    await expressElement.click();
    await new Promise((res) => setTimeout(res, 1000));
    const gitVersionElement = await view.findWebElement(
      By.xpath(`.//label[@data-config-id='git-version']`)
    );
    const gitVersionMsg = await gitVersionElement.getText();
    expect(gitVersionMsg).to.match(/Git version:.*/g);
    const selectEspIdfElement = await view.findWebElement(
      By.id("select-esp-idf")
    );
    const idfChoices = await selectEspIdfElement.findElements(By.css("option"));
    expect(idfChoices).to.be.an("array");
    // idfChoices.map(async (idfChoice) => {
    //   const optionTxt = await idfChoice.getText();
    //   console.log(optionTxt);
    // });
    await idfChoices[idfChoices.length - 1].click();

    // Find ESP-IDF in the system
    const manualIdfDirectory = await view.findWebElement(
      By.xpath(
        `.//div[@data-config-id='manual-idf-directory']//input[@type='text']`
      )
    );
    const defaultIdfDirectory = await manualIdfDirectory.getAttribute("value");
    const expectedDir = process.env.IDF_PATH
      ? process.env.IDF_PATH
      : join(process.env.HOME, "esp", "esp-idf");
    expect(defaultIdfDirectory).to.be.equal(expectedDir);

    const selectPythonElement = await view.findWebElement(
      By.id("python-version-select")
    );
    await new Promise((res) => setTimeout(res, 1000));
    const pyChoices = await selectPythonElement.findElements(By.css("option"));
    for (const pyChoice of pyChoices) {
      const pyText = await pyChoice.getText();
      console.log(pyText);
      if (pyText.indexOf("python3") !== -1) {
        await pyChoice.click();
        break;
      }
    }
    // Start setup install
    const startInstallBtn = await view.findWebElement(
      By.xpath(`.//button[@data-config-id='start-install-btn']`)
    );
    await startInstallBtn.click();
    await new Promise((res) => setTimeout(res, 3000));
    // Status windows is loaded
    const espIdfInstalledPath = await view.findWebElement(
      By.xpath(`.//p[@data-config-id='esp-idf-download-status']`)
    );
    const espIdfDestPathMsg = await espIdfInstalledPath.getText();
    const expectedEspIdfDestPath = `ESP-IDF is installed in ${expectedDir}`;
    expect(espIdfDestPathMsg).to.be.equal(expectedEspIdfDestPath);

    await new Promise((res) => setTimeout(res, 20000));

    // Show setup has finished
    const setupFinishedElement = await view.findWebElement(
      By.xpath(`.//h2[@data-config-id='setup-is-finished']`)
    );
    const setupFinishedText = await setupFinishedElement.getText();
    expect(setupFinishedText).to.be.equal(
      "All settings have been configured. You can close this window."
    );
    if (view) {
      await view.switchBack();
      await new EditorView().closeAllEditors();
    }
  }).timeout(60000);

  it("Configure using Advanced", async () => {
    await new Workbench().executeCommand("espIdf.setup.start");
    await new Promise((res) => setTimeout(res, 12000));
    view = new WebView();
    await view.switchToFrame();
    await new Promise((res) => setTimeout(res, 1000));
    const advancedElement = await view.findWebElement(
      By.id("advanced-install-btn")
    );
    await advancedElement.click();
    await new Promise((res) => setTimeout(res, 1000));
    const selectEspIdfElement = await view.findWebElement(
      By.id("select-esp-idf")
    );
    const gitVersionElement = await view.findWebElement(
      By.xpath(`.//label[@data-config-id='git-version']`)
    );
    const gitVersionMsg = await gitVersionElement.getText();
    expect(gitVersionMsg).to.match(/Git version:.*/g);
    const idfChoices = await selectEspIdfElement.findElements(By.css("option"));
    expect(idfChoices).to.be.an("array");
    await idfChoices[idfChoices.length - 1].click();

    // Find ESP-IDF in the system
    const manualIdfDirectory = await view.findWebElement(
      By.xpath(
        `.//div[@data-config-id='manual-idf-directory']//input[@type='text']`
      )
    );
    const defaultIdfDirectory = await manualIdfDirectory.getAttribute("value");
    const expectedDir = process.env.IDF_PATH
      ? process.env.IDF_PATH
      : join(process.env.HOME, "esp", "esp-idf");
    expect(defaultIdfDirectory).to.be.equal(expectedDir);

    const selectPythonElement = await view.findWebElement(
      By.id("python-version-select")
    );
    await new Promise((res) => setTimeout(res, 1000));
    const pyChoices = await selectPythonElement.findElements(By.css("option"));
    for (const pyChoice of pyChoices) {
      const pyText = await pyChoice.getText();
      console.log(pyText);
      if (pyText.indexOf("python3") !== -1) {
        await pyChoice.click();
        break;
      }
    }
    // Start setup install
    const startInstallBtn = await view.findWebElement(
      By.xpath(`.//button[@data-config-id='start-install-btn']`)
    );
    await startInstallBtn.click();
    await new Promise((res) => setTimeout(res, 3000));

    // select-esp-idf-tools
    const idfToolSelect = await view.findWebElement(
      By.xpath(`.//select[@data-config-id='select-esp-idf-tools']`)
    );
    const idfToolsSelectChoices = await idfToolSelect.findElements(By.css("option"));
    await idfToolsSelectChoices[idfToolsSelectChoices.length - 1].click();

    if (view) {
      await view.switchBack();
    }
  }).timeout(80000);
});
