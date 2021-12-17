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
import { By, EditorView, WebView, Workbench } from "vscode-extension-tester";

describe("Configure extension", () => {
  let view: WebView;

  before(async function () {
    this.timeout(100000);
    await new Promise((res) => setTimeout(res, 2000));
    await new Workbench().executeCommand("espIdf.setup.start");
    await new Promise((res) => setTimeout(res, 20000));
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
    await new Promise((res) => setTimeout(res, 3000));
    const gitVersionElement = await view.findWebElement(
      By.xpath(`.//label[@data-config-id='git-version']`)
    );
    const gitVersionMsg = await gitVersionElement.getText();
    console.log(gitVersionMsg);
    expect(gitVersionMsg).to.match(/Git version:.*/g);

    // const selectEspIdfElement = await view.findElement(
    //   By.xpath(`.//[@id="select-esp-idf"]`)
    // );
    // await new Promise((res) => setTimeout(res, 1000));
    // const currValue = await selectEspIdfElement.getAttribute("value");
    // console.log(currValue);
    // const idfChoices = await selectEspIdfElement.findElements(By.css("option"));
    // expect(idfChoices).to.be.an("array");
    // console.log(idfChoices);
    // await idfChoices[1].click();

    if (view) {
      await view.switchBack();
    }
  }).timeout(25000);
});
