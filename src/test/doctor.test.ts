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
import * as os from "os";
import { join } from "path";
import * as vscode from "vscode";
import { ESP } from "../config";
import { setExtensionContext } from "../utils";
import { Logger } from "../logger/logger";
import { OutputChannel } from "../logger/outputChannel";
import { initializeReportObject } from "../support/initReportObj";
import { getConfigurationAccess } from "../support/configurationAccess";
import { getEspIdfVersion } from "../support/espIdfVersion";
import { getPythonVersion } from "../support/pythonVersion";
import { checkSystemInfo } from "../support/checkSystemInfo";
import { getConfigurationSettings } from "../support/configurationSettings";
import { readJSON } from "fs-extra";

suite("Doctor command tests", () => {
  const reportObj = initializeReportObject();
  const absPath = (filename) => join(__dirname, filename);
  const mockUpContext: vscode.ExtensionContext = {
    extensionPath: __dirname,
    asAbsolutePath: absPath,
  } as vscode.ExtensionContext;
  let settingsJsonObj: any;
  setup(async () => {
    setExtensionContext(mockUpContext);
    Logger.init(mockUpContext);
    const output = OutputChannel.init();
    settingsJsonObj = await readJSON(
      join(__dirname, "../../testFiles/testWorkspace/.vscode/settings.json")
    );
  });

  test("Check system information", () => {
    checkSystemInfo(reportObj);
    assert.equal(reportObj.systemInfo.architecture, os.arch());

    const processPathEnvVar =
      process.platform === "win32" ? process.env.Path : process.env.PATH;
    assert.equal(reportObj.systemInfo.envPath, processPathEnvVar);

    const extensionObj = vscode.extensions.getExtension(ESP.extensionID);
    assert.equal(
      reportObj.systemInfo.extensionVersion,
      extensionObj.packageJSON.version
    );
    assert.equal(reportObj.systemInfo.language, vscode.env.language);
    assert.equal(reportObj.systemInfo.platform, os.platform());
    assert.equal(reportObj.systemInfo.systemName, os.release());
    assert.equal(reportObj.systemInfo.shell, vscode.env.shell);
    assert.equal(reportObj.systemInfo.vscodeVersion, vscode.version);
  });

  test("Test configuration settings", () => {
    console.log(settingsJsonObj);
    getConfigurationSettings(reportObj);
    assert.equal(
      reportObj.configurationSettings.espIdfPath,
      settingsJsonObj["idf.espIdfPath"]
    );
    assert.equal(
      reportObj.configurationSettings.customExtraPaths,
      settingsJsonObj["idf.customExtraPaths"]
    );
    assert.equal(
      reportObj.configurationSettings.customExtraVars,
      settingsJsonObj["idf.customExtraVars"]
    );
    assert.equal(
      reportObj.configurationSettings.serialPort,
      settingsJsonObj["idf.port"]
    );
    assert.equal(
      reportObj.configurationSettings.pythonBinPath,
      settingsJsonObj["idf.pythonBinPath"]
    );
    assert.deepEqual(
      reportObj.configurationSettings.openOcdConfigs,
      settingsJsonObj["idf.openOcdConfigs"]
    );
    assert.equal(
      reportObj.configurationSettings.toolsPath,
      settingsJsonObj["idf.toolsPath"]
    );
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

  test("Check wrong access to Python path", () => {
    reportObj.configurationSettings.pythonBinPath = "/some/non-existing-path";
    getConfigurationAccess(reportObj, mockUpContext);
    assert.equal(reportObj.configurationAccess.pythonBinPath, false);
  });

  test("Check wrong python", async () => {
    reportObj.configurationSettings.pythonBinPath = "/my/wrong/python/path";
    await getPythonVersion(reportObj, mockUpContext);
    assert.equal(reportObj.pythonVersion.result, "Not found");
  });
});
