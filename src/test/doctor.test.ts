/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 7th April 2021 4:04:27 pm
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

import * as assert from "assert";
import * as os from "os";
import { delimiter, join, resolve } from "path";
import * as vscode from "vscode";
import { ESP } from "../config";
import { setExtensionContext } from "../utils";
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
  checkCCppPropertiesJson,
  checkLaunchJson,
} from "../support/checkVscodeFiles";
import { getPythonPackages } from "../support/pythonPackages";
import { getGitVersion } from "../support/gitVersion";
import { writeTextReport } from "../support/writeReport";

suite("Doctor Command tests", () => {
  const reportObj = initializeReportObject();
  const absPath = (filename) => resolve(__dirname, "..", "..", filename);
  const mockUpContext: vscode.ExtensionContext = {
    extensionPath: resolve(__dirname, "..", ".."),
    asAbsolutePath: absPath,
  } as vscode.ExtensionContext;
  setup(async () => {
    setExtensionContext(mockUpContext);
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
    assert.equal(reportObj.espIdfVersion.result, "x.x");
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
    await getConfigurationSettings(
      reportObj,
      vscode.Uri.file(join(__dirname, "../../testFiles/testWorkspace"))
    );
    assert.equal(
      reportObj.configurationSettings.espAdfPath,
      settingsJsonObj["idf.espAdfPath"]
    );
    assert.equal(
      reportObj.configurationSettings.espMdfPath,
      settingsJsonObj["idf.espMdfPath"]
    );
    assert.equal(
      reportObj.configurationSettings.serialPort,
      settingsJsonObj["idf.port"]
    );
    assert.deepEqual(
      reportObj.configurationSettings.openOcdConfigs,
      settingsJsonObj["idf.openOcdConfigs"]
    );
    assert.equal(
      reportObj.configurationSettings.notificationMode,
      settingsJsonObj["idf.notificationMode"]
    );
  });

  test("Good esp-idf py requirements", async () => {
    reportObj.configurationSettings.pythonBinPath = `${process.env.IDF_PYTHON_ENV_PATH}/bin/python`;
    reportObj.configurationSettings.espIdfPath = process.env.IDF_PATH;
    await checkEspIdfRequirements(reportObj, mockUpContext);
    assert.equal(
      reportObj.idfCheckRequirements.result,
      `Python requirements from ${process.env.IDF_PATH}/requirements.txt are satisfied.`
    );
  });

  test("Good configuration access", async () => {
    reportObj.configurationSettings.pythonBinPath = `${process.env.IDF_PYTHON_ENV_PATH}/bin/python`;
    reportObj.configurationSettings.espIdfPath = process.env.IDF_PATH;
    reportObj.configurationSettings.customExtraPaths = process.env.PATH.replace(
      delimiter + process.env.OLD_PATH,
      ""
    );
    getConfigurationAccess(reportObj, mockUpContext);
    assert.equal(reportObj.configurationAccess.pythonBinPath, true);
    assert.equal(reportObj.configurationAccess.espIdfPath, true);
    for (let toolPath in reportObj.configurationAccess.espIdfToolsPaths) {
      if (toolPath.indexOf(process.env.IDF_TOOLS_PATH) !== -1) {
        assert.equal(
          reportObj.configurationAccess.espIdfToolsPaths[toolPath],
          true
        );
      }
    }
  });

  test("Match git version", async () => {
    await getGitVersion(reportObj, mockUpContext);
    assert.equal(reportObj.gitVersion.result, process.env.GIT_VERSION);
  });

  test("Match ESP-IDF version", async () => {
    reportObj.configurationSettings.espIdfPath = process.env.IDF_PATH;
    await getEspIdfVersion(reportObj);
    assert.equal(reportObj.espIdfVersion.result, process.env.IDF_VERSION);
  });

  test("Match python version", async () => {
    reportObj.configurationSettings.pythonBinPath = `${process.env.IDF_PYTHON_ENV_PATH}/bin/python`;
    await getPythonVersion(reportObj, mockUpContext);
    assert.equal(reportObj.pythonVersion.result, process.env.PY_VERSION);
  });

  test("Match pip version", async () => {
    reportObj.configurationSettings.pythonBinPath = `${process.env.IDF_PYTHON_ENV_PATH}/bin/python`;
    await getPipVersion(reportObj, mockUpContext);
    assert.equal(reportObj.pipVersion.result, process.env.PIP_VERSION);
  });

  test("Match python packages", async () => {
    reportObj.configurationSettings.pythonBinPath = `${process.env.IDF_PYTHON_ENV_PATH}/bin/python`;
    const expectedPyPkgs = JSON.parse(process.env.PY_PKGS);
    await getPythonPackages(reportObj, mockUpContext);
    assert.deepEqual(
      reportObj.configurationSettings.pythonPackages,
      expectedPyPkgs
    );
  });

  test("Match written report", async () => {
    const customExtraPaths = process.env.PATH.replace(
      delimiter + process.env.OLD_PATH,
      ""
    );
    const processPathEnvVar =
      process.platform === "win32" ? process.env.Path : process.env.PATH;
    const extensionObj = vscode.extensions.getExtension(ESP.extensionID);
    let expectedOutput = `---------------------------------------------- ESP-IDF Extension for Visual Studio Code report ---------------------------------------------${os.EOL}`;
    expectedOutput += `OS ${os.platform()} ${os.arch()} ${os.release()} ${
      os.EOL
    }`;
    expectedOutput += `System environment variable IDF_PYTHON_ENV_PATH ${os.EOL} ${process.env.IDF_PYTHON_ENV_PATH} ${os.EOL}`;
    expectedOutput += `System environment variable PATH ${os.EOL} ${processPathEnvVar} ${os.EOL}`;
    expectedOutput += `System environment variable PYTHON ${os.EOL} ${process.env.PYTHON} ${os.EOL}`;
    expectedOutput += `Visual Studio Code version ${vscode.version} ${os.EOL}`;
    expectedOutput += `Visual Studio Code language ${vscode.env.language} ${os.EOL}`;
    expectedOutput += `Visual Studio Code shell ${vscode.env.shell} ${os.EOL}`;
    expectedOutput += `ESP-IDF Extension version ${extensionObj.packageJSON.version} ${os.EOL}`;
    expectedOutput += `Workspace folder ${reportObj.workspaceFolder} ${os.EOL}`;
    expectedOutput += `---------------------------------------------------- Extension configuration settings ------------------------------------------------------${os.EOL}`;
    expectedOutput += `ESP-ADF Path (idf.espAdfPath) ${reportObj.configurationSettings.espAdfPath}${os.EOL}`;
    expectedOutput += `ESP-IDF Path (idf.espIdfPath) ${process.env.IDF_PATH}${os.EOL}`;
    expectedOutput += `ESP-MDF Path (idf.espMdfPath) ${reportObj.configurationSettings.espMdfPath}${os.EOL}`;
    expectedOutput += `ESP-Matter Path (idf.espMatterPath) ${reportObj.configurationSettings.espMatterPath}${os.EOL}`;
    expectedOutput += `ESP-HomeKit-SDK Path (idf.espHomeKitSdkPath) ${reportObj.configurationSettings.espHomeKitPath}${os.EOL}`;
    expectedOutput += `Custom extra paths ${customExtraPaths}${os.EOL}`;
    if (
      reportObj.configurationSettings.idfExtraVars &&
      Object.keys(reportObj.configurationSettings.idfExtraVars)
    ) {
      expectedOutput += `ESP-IDF extra vars${os.EOL}`;
      for (let key in reportObj.configurationSettings.idfExtraVars) {
        expectedOutput += `    ${key}: ${reportObj.configurationSettings.idfExtraVars[key]}${os.EOL}`;
      }
    }
    if (
      reportObj.configurationSettings.userExtraVars &&
      Object.keys(reportObj.configurationSettings.userExtraVars)
    ) {
      expectedOutput += `User extra vars (idf.customExtraVars)${os.EOL}`;
      for (let key in reportObj.configurationSettings.userExtraVars) {
        expectedOutput += `    ${key}: ${reportObj.configurationSettings.userExtraVars[key]}${os.EOL}`;
      }
    }
    expectedOutput += `Virtual environment Python path (computed) ${
      process.env.IDF_PYTHON_ENV_PATH + "/bin/python"
    }${os.EOL}`;
    expectedOutput += `Serial port (idf.port) ${reportObj.configurationSettings.serialPort}${os.EOL}`;
    expectedOutput += `OpenOCD Configs (idf.openOcdConfigs) ${reportObj.configurationSettings.openOcdConfigs}${os.EOL}`;
    expectedOutput += `ESP-IDF Tools Path (idf.toolsPath) ${reportObj.configurationSettings.toolsPath}${os.EOL}`;
    expectedOutput += `Git Path (idf.gitPath) ${reportObj.configurationSettings.gitPath}${os.EOL}`;
    expectedOutput += `Notification Mode (idf.notificationMode) ${reportObj.configurationSettings.notificationMode}${os.EOL}`;
    const actualReport = await writeTextReport(reportObj, mockUpContext);
    const subReport = actualReport.slice(
      0,
      actualReport.indexOf(
        "-------------------------------------------------------- Configurations access -------------------------------------------------------------"
      )
    );
    assert.equal(subReport, expectedOutput);
  });
});
