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
import { join, resolve } from "path";
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
import { readFile, readJSON } from "fs-extra";
import { getPipVersion } from "../support/pipVersion";
import { checkEspIdfRequirements } from "../support/checkEspIdfRequirements";
import {
  checkDebugAdapterRequirements,
  checkExtensionRequirements,
} from "../support/checkExtensionRequirements";
import {
  checkCCppPropertiesJson,
  checkLaunchJson,
} from "../support/checkVscodeFiles";

suite("Doctor command tests", () => {
  const reportObj = initializeReportObject();
  const absPath = (filename) => resolve(__dirname, "..", "..", filename);
  const mockUpContext: vscode.ExtensionContext = {
    extensionPath: resolve(__dirname, "..", ".."),
    asAbsolutePath: absPath,
  } as vscode.ExtensionContext;
  setup(async () => {
    setExtensionContext(mockUpContext);
    // Logger.init(mockUpContext);
    // const output = OutputChannel.init();
  });

  test("System information", () => {
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

  test("Wrong access to ESP-IDF path", () => {
    reportObj.configurationSettings.espIdfPath = "/some/non-existing-path";
    getConfigurationAccess(reportObj, mockUpContext);
    assert.equal(reportObj.configurationAccess.espIdfPath, false);
  });

  test("Wrong version of ESP-IDF", async () => {
    reportObj.configurationSettings.espIdfPath = "/some/non-existing-path";
    await getEspIdfVersion(reportObj);
    assert.equal(reportObj.espIdfVersion.result, "Not found");
  });

  test("Wrong access to Python path", () => {
    reportObj.configurationSettings.pythonBinPath = "/some/non-existing-path";
    getConfigurationAccess(reportObj, mockUpContext);
    assert.equal(reportObj.configurationAccess.pythonBinPath, false);
  });

  test("Wrong python", async () => {
    reportObj.configurationSettings.pythonBinPath = "/my/wrong/python/path";
    await getPythonVersion(reportObj, mockUpContext);
    assert.equal(reportObj.pythonVersion.result, "Not found");
  });

  test("Wrong pip", async () => {
    reportObj.configurationSettings.pythonBinPath = "/my/wrong/python/path";
    await getPipVersion(reportObj, mockUpContext);
    assert.equal(reportObj.pipVersion.result, "Not found");
  });

  test("wrong extension py requirements", async () => {
    reportObj.configurationSettings.pythonBinPath = "/my/wrong/python/path";
    await checkExtensionRequirements(reportObj, mockUpContext);
    assert.equal(reportObj.extensionRequirements.result, "Error");
  });

  test("Wrong debug adapter py requirements", async () => {
    reportObj.configurationSettings.pythonBinPath = "/my/wrong/python/path";
    await checkDebugAdapterRequirements(reportObj, mockUpContext);
    assert.equal(reportObj.debugAdapterRequirements.result, "Error");
  });

  test("Wrong esp-idf py requirements", async () => {
    reportObj.configurationSettings.pythonBinPath = "/my/wrong/python/path";
    await checkEspIdfRequirements(reportObj, mockUpContext);
    assert.equal(reportObj.idfCheckRequirements.result, "Error");
  });

  test("launch.json", async () => {
    const templateLaunchJson = await readFile(
      join(__dirname, "../../templates/.vscode/launch.json"),
      "utf8"
    );
    await checkLaunchJson(
      reportObj,
      vscode.Uri.file(join(__dirname, "../../testFiles/testWorkspace"))
    );
    assert.equal(reportObj.launchJson, templateLaunchJson);
  });

  test("c_cpp_properties.json", async () => {
    const templateLaunchJson = await readFile(
      join(__dirname, "../../templates/.vscode/c_cpp_properties.json"),
      "utf8"
    );
    await checkCCppPropertiesJson(
      reportObj,
      vscode.Uri.file(join(__dirname, "../../testFiles/testWorkspace"))
    );
    assert.equal(reportObj.cCppPropertiesJson, templateLaunchJson);
  });

  test("Test configuration settings", async () => {
    const settingsJsonObj = await readJSON(
      join(__dirname, "../../testFiles/testWorkspace/.vscode/settings.json")
    );
    console.log(`old path: ${process.env.OLD_PATH}`);
    console.log(`env path: ${process.env.IDF_PYTHON_ENV_PATH}`);
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
});
