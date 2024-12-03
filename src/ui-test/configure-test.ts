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
import { spawn } from "child_process";
import { readJSON } from "fs-extra";
import { EOL } from "os";
import { delimiter, join, sep } from "path";
import { By, EditorView, WebView, Workbench } from "vscode-extension-tester";

describe("Configure extension", () => {
  let view: WebView;
  const expectedDir = process.env.IDF_PATH
    ? process.env.IDF_PATH
    : join(process.env.HOME, "esp", "esp-idf");

  before(async function () {
    this.timeout(100000);
    await new Promise((res) => setTimeout(res, 10000));
    const notifications = await new Workbench().getNotifications();
    for (let n of notifications) {
      await n.dismiss();
    }
    await new Workbench().executeCommand("espIdf.setup.start");
    await new Promise((res) => setTimeout(res, 12000));
    view = new WebView();
    await view.switchToFrame();
  });

  async function isBinInPath(
    binaryName: string,
    workDirectory: string,
    env: NodeJS.ProcessEnv
  ) {
    const cmd = process.platform === "win32" ? "where" : "which";

    return new Promise<string>((resolve, reject) => {
      const options = {
        cwd: workDirectory,
        env,
      };
      const child = spawn(cmd, [binaryName], options);
      let buff = Buffer.alloc(0);
      const sendToBuffer = (data: Buffer) => {
        buff = Buffer.concat([buff, data]);
      };

      child.stdout.on("data", sendToBuffer);
      child.stderr.on("data", sendToBuffer);

      child.on("exit", (code) => {
        if (code !== 0) {
          const err = new Error(
            `non zero exit code ${code}. ${EOL + EOL + buff}`
          );
          console.error(err.message);
          return reject(err);
        }
        return resolve(buff.toString());
      });
    });
  }

  async function selectEspIdfVersion(view: WebView) {
    const selectEspIdfElement = await view.findWebElement(
      By.id("select-esp-idf")
    );
    const idfChoices = await selectEspIdfElement.findElements(By.css("option"));
    expect(idfChoices).to.be.an("array");
    await idfChoices[0].click();
  }

  async function checkGitVersion(view: WebView) {
    const gitVersionElement = await view.findWebElement(
      By.xpath(`.//label[@data-config-id='git-version']`)
    );
    const gitVersionMsg = await gitVersionElement.getText();
    expect(gitVersionMsg).to.match(/Git version:.*/g);
  }

  async function checkManualEspIdfPath(view: WebView) {
    const manualIdfDirectory = await view.findWebElement(
      By.xpath(
        `.//div[@data-config-id='manual-idf-directory']//input[@type='text']`
      )
    );
    const defaultIdfDirectory = await manualIdfDirectory.getAttribute("value");
    expect(defaultIdfDirectory).to.be.equal(expectedDir);
  }

  async function selectPythonExecutable(view: WebView) {
    const selectPythonElement = await view.findWebElement(
      By.id("python-version-select")
    );
    await new Promise((res) => setTimeout(res, 1000));
    const pyChoices = await selectPythonElement.findElements(By.css("option"));
    for (const pyChoice of pyChoices) {
      const pyText = await pyChoice.getText();
      if (pyText.indexOf("/usr/bin/python3") !== -1) {
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
  }

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

    await checkGitVersion(view);
    await selectEspIdfVersion(view);
    await checkManualEspIdfPath(view);
    await selectPythonExecutable(view);

    // Status windows is loaded
    const espIdfInstalledPath = await view.findWebElement(
      By.xpath(`.//p[@data-config-id='esp-idf-download-status']`)
    );
    const espIdfDestPathMsg = await espIdfInstalledPath.getText();
    const expectedEspIdfDestPath = `ESP-IDF is installed in ${expectedDir}`;
    expect(espIdfDestPathMsg).to.be.equal(expectedEspIdfDestPath);

    await new Promise((res) => setTimeout(res, 100000));

    // Show setup has finished
    const setupFinishedElement = await view.findWebElement(
      By.xpath(`.//h2[@data-config-id='setup-is-finished']`)
    );
    const setupFinishedText = await setupFinishedElement.getText();
    expect(setupFinishedText).to.be.equal(
      "All settings have been configured."
    );
    if (view) {
      await view.switchBack();
      await new EditorView().closeAllEditors();
    }
  }).timeout(120000);

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
    await selectEspIdfVersion(view);

    await checkGitVersion(view);

    await checkManualEspIdfPath(view);

    await selectPythonExecutable(view);

    // select-esp-idf-tools
    const idfToolSelect = await view.findWebElement(
      By.xpath(`.//select[@data-config-id='select-esp-idf-tools']`)
    );
    const idfToolsSelectChoices = await idfToolSelect.findElements(
      By.css("option")
    );
    await idfToolsSelectChoices[idfToolsSelectChoices.length - 1].click();

    // Get current settings
    const settingsJsonObj = await readJSON(
      join(__dirname, "../../test-resources/settings/User/settings.json")
    );
    const modifiedEnv: { [key: string]: string } = <{ [key: string]: string }>(
      Object.assign({}, process.env)
    );
    // openOCD-esp32
    const openOCDPath = await isBinInPath("openocd", __dirname, modifiedEnv);
    const openOcdTool = await view.findWebElement(By.id("openocd-esp32"));
    const expectedOpenOcdPath = openOCDPath
      .trim()
      .replace(sep + "bin" + sep + "openocd", sep + "bin");
    const actualOpenOcdPath = await openOcdTool.getAttribute("value");
    expect(expectedOpenOcdPath).to.be.equal(actualOpenOcdPath);
    // xtensa-esp32-elf/
    const xtensaEsp32Path = await isBinInPath(
      "xtensa-esp32-elf-gcc",
      __dirname,
      modifiedEnv
    );
    const xtensaEsp32Tool = await view.findWebElement(
      By.id("xtensa-esp32-elf")
    );
    const expectedXtensaEsp32Path = xtensaEsp32Path
      .trim()
      .replace(sep + "bin" + sep + "xtensa-esp32-elf-gcc", sep + "bin");
    const actualXtensaEsp32Path = await xtensaEsp32Tool.getAttribute("value");
    expect(expectedXtensaEsp32Path).to.be.equal(actualXtensaEsp32Path);

    // save-existing-tools
    const saveExistingToolsBtn = await view.findWebElement(
      By.xpath(`.//button[@data-config-id='save-existing-tools']`)
    );
    await saveExistingToolsBtn.click();

    await new Promise((res) => setTimeout(res, 100000));

    // Show setup has finished
    const setupFinishedElement = await view.findWebElement(
      By.xpath(`.//h2[@data-config-id='setup-is-finished']`)
    );
    const setupFinishedText = await setupFinishedElement.getText();
    expect(setupFinishedText).to.be.equal(
      "All settings have been configured."
    );
    if (view) {
      await view.switchBack();
      await new EditorView().closeAllEditors();
    }
  }).timeout(130000);

  it("Configure using existing setup", async () => {
    await new Workbench().executeCommand("espIdf.setup.start");
    await new Promise((res) => setTimeout(res, 12000));
    view = new WebView();
    await view.switchToFrame();
    await new Promise((res) => setTimeout(res, 1000));
    const existingSetupElement = await view.findWebElement(
      By.id("existing-install-btn")
    );
    await existingSetupElement.click();
    await new Promise((res) => setTimeout(res, 1000));
    // Status windows is loaded
    const expectedDir = process.env.IDF_PATH
      ? process.env.IDF_PATH
      : join(process.env.HOME, "esp", "esp-idf");
    const espIdfInstalledPath = await view.findWebElement(
      By.xpath(`.//div[@data-config-id='${expectedDir}']`)
    );
    const espIdfDestPathMsg = await espIdfInstalledPath.getText();
    expect(espIdfDestPathMsg).to.include(expectedDir);

    await espIdfInstalledPath.click();

    await new Promise((res) => setTimeout(res, 60000));

    // Show setup has finished
    const setupFinishedElement = await view.findWebElement(
      By.xpath(`.//h2[@data-config-id='setup-is-finished']`)
    );
    const setupFinishedText = await setupFinishedElement.getText();
    expect(setupFinishedText).to.be.equal(
      "All settings have been configured."
    );

    if (view) {
      await view.switchBack();
    }
  }).timeout(100000);
});
