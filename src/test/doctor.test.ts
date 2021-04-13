/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 7th April 2021 4:04:27 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as assert from "assert";
import { join } from "path";
import { ExtensionContext } from "vscode";

import { setExtensionContext } from "../utils";
import { Logger } from "../logger/logger";
import { OutputChannel } from "../logger/outputChannel";
import { initializeReportObject } from "../support/initReportObj";
import { getConfigurationAccess } from "../support/configurationAccess";
import { getEspIdfVersion } from "../support/espIdfVersion";
import { getPythonVersion } from "../support/pythonVersion";

suite("Doctor command tests", () => {
  const reportObj = initializeReportObject();
  const absPath = (filename) => join(__dirname, filename);
  const mockUpContext: ExtensionContext = {
    extensionPath: __dirname,
    asAbsolutePath: absPath,
  } as ExtensionContext;
  setup((done) => {
    setExtensionContext(mockUpContext);
    Logger.init(mockUpContext);
    const output = OutputChannel.init();
    done();
  });

  test("Check wrong access to ESP-IDF path", () => {
    reportObj.configurationSettings.espIdfPath = "/some/non-existing-path";
    getConfigurationAccess(reportObj, mockUpContext);
    assert.equal(reportObj.configurationAccess.espIdfPath, false);
  });
  test("Check wrong version of ESP-IDF", async () => {
    reportObj.configurationSettings.espIdfPath = "/some/non-existing-path";
    await getEspIdfVersion(reportObj);
    assert.equal(reportObj.espIdfVersion.result, "Not found");
  });

  test("Check wrong python", async () => {
    reportObj.configurationSettings.pythonBinPath = "/my/wrong/python/path";
    await getPythonVersion(reportObj, mockUpContext);
    assert.equal(reportObj.pythonVersion.result, "Not found");
  });
});
