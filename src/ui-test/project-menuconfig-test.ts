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

import { expect } from "chai";
import { Workbench, EditorView, WebView, By } from "vscode-extension-tester";

describe("SDKConfig Editor", () => {
  let view: WebView;

  before(async function () {
    this.timeout(100000);
    await new Workbench().executeCommand("espIdf.menuconfig.start");
    await new Promise((res) => setTimeout(res, 50000));
    view = new WebView();
    await view.switchToFrame();
  });

  after(async () => {
    if (view) {
      await view.switchBack();
    }
    await new EditorView().closeAllEditors();
  });

  it("find Save button works", async () => {
    const element = await view.findWebElement(By.id("searchbar-save"));
    expect(await element.getText()).has.string("Save");
  });

  it("find compiler toolprefix", async () => {
    const element = await view.findWebElement(
      By.xpath(`.//label[@data-config-id='SDK_TOOLPREFIX']`)
    );
    expect(await element.getText()).has.string(
      "Compiler toolchain path/prefix"
    );
  });

  it("Check int default value", async () => {
    const elem = await view.findWebElement(
      By.xpath(`.//input[@data-config-id='BOOTLOADER_WDT_TIME_MS']`)
    );
    const result = await elem.getAttribute("value");
    expect(result).has.string("9000");
  });

  it("Check hex default value", async () => {
    const elem = await view.findWebElement(
      By.xpath(`.//input[@data-config-id='PARTITION_TABLE_OFFSET']`)
    );
    const result = await elem.getAttribute("value");
    expect(result).has.string("0x8000");
  });

  it("Check bool default value", async () => {
    const elem = await view.findWebElement(
      By.xpath(`.//input[@data-config-id='BOOTLOADER_FACTORY_RESET']`)
    );
    const result = await elem.getAttribute("value");
    expect(result).has.string("on");
  });

  it("Check choice has options and default value", async () => {
    const elem = await view.findWebElement(
      By.xpath(
        `.//select[@data-config-id='bootloader-config-vddsdio-ldo-voltage']`
      )
    );
    const result = await elem.getAttribute("value");
    expect(result).has.string("BOOTLOADER_VDDSDIO_BOOST_1_9V");
    const children = await elem.findElements(By.css("option"));
    expect(children).to.be.an("array");
    expect(await children[0].getText()).has.string("1.8V");
    expect(await children[1].getText()).has.string("1.9V");
  });
});
