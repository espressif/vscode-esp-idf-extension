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
import {
  ESP_IDF_COMMANDS,
  dismissNotifications,
  executeEspIdfCommand,
  executeEspIdfCommandAndSelectOption,
  helloWorldBinPath,
  openTestProject,
  testHardwareSerialPort,
  waitForBuildComplete,
  waitForPathAbsent,
  waitForTerminalOutput,
} from "./ui-test-helpers";

const FLASH_SUCCESS_PATTERN =
  /Hash of data verified|Flash Done|Hard resetting via RTS pin/;

const MONITOR_OUTPUT_PATTERN = /UI test monitor output check/;

const hardwareE2eState = {
  buildSucceeded: false,
  flashSucceeded: false,
};

describe("Hardware E2E: build → flash → monitor", () => {
  before(async function () {
    this.timeout(100000);
    await dismissNotifications();
    await openTestProject();
  });

  it("builds testWorkspace", async function () {
    await new Promise((res) => setTimeout(res, 3000));
    await executeEspIdfCommand(ESP_IDF_COMMANDS.fullClean);
    await waitForPathAbsent(helloWorldBinPath, 60000);

    await executeEspIdfCommand(ESP_IDF_COMMANDS.build);
    const buildOutput = await waitForBuildComplete(helloWorldBinPath, 300000);
    console.log(buildOutput);
    hardwareE2eState.buildSucceeded = true;
  }).timeout(999999);

  it("flashes testWorkspace", async function () {
    if (!hardwareE2eState.buildSucceeded) {
      this.skip();
    }

    await executeEspIdfCommandAndSelectOption(
      ESP_IDF_COMMANDS.selectPort,
      testHardwareSerialPort
    );
    await executeEspIdfCommandAndSelectOption(
      ESP_IDF_COMMANDS.selectFlashMethod,
      "UART"
    );

    await executeEspIdfCommand(ESP_IDF_COMMANDS.flash);
    const flashOutput = await waitForTerminalOutput(
      FLASH_SUCCESS_PATTERN,
      180000
    );
    console.log(flashOutput);
    expect(FLASH_SUCCESS_PATTERN.test(flashOutput)).to.be.true;
    hardwareE2eState.flashSucceeded = true;
  }).timeout(999999);

  it("shows expected monitor output", async function () {
    if (!hardwareE2eState.flashSucceeded) {
      this.skip();
    }

    await executeEspIdfCommandAndSelectOption(
      ESP_IDF_COMMANDS.selectMonitorPort,
      testHardwareSerialPort
    );
    await executeEspIdfCommand(ESP_IDF_COMMANDS.monitor);
    const monitorOutput = await waitForTerminalOutput(
      MONITOR_OUTPUT_PATTERN,
      120000
    );
    console.log(monitorOutput);
    expect(MONITOR_OUTPUT_PATTERN.test(monitorOutput)).to.be.true;
  }).timeout(999999);
});
