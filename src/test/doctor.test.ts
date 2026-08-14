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
import { writeTextReport } from "../support/writeReport";
import { ProjectConfigStore } from "../project-conf";
import { createMockMemento } from "./mockUtils";
import { Logger } from "../common/logger";

suite("Doctor Command tests", () => {
  const reportObj = initializeReportObject();
  const absPath = (filename: string) =>
    resolve(__dirname, "..", "..", filename);
  const mockUpContext: vscode.ExtensionContext = {
    extensionPath: resolve(__dirname, "..", ".."),
    asAbsolutePath: absPath,
    workspaceState: createMockMemento(),
    globalState: createMockMemento(),
  } as vscode.ExtensionContext;
  Logger.init(mockUpContext);
  ESP.ProjectConfiguration.store = ProjectConfigStore.resetForTests(mockUpContext);
  setup(async () => {
    reportObj.workspaceFolder = join(
      __dirname,
      "../../testFiles/testWorkspace"
    );
  });

  test("System information", () => {
    checkSystemInfo(reportObj);
    assert.equal(reportObj.systemInfo.architecture, os.arch());

    const processPathEnvVar =
      process.platform === "win32" ? process.env.Path : process.env.PATH;
    assert.equal(reportObj.systemInfo.envPath, processPathEnvVar);

    const extensionObj = vscode.extensions.getExtension(ESP.extensionID);
    assert.notEqual(extensionObj, undefined);
    assert.equal(
      reportObj.systemInfo.extensionVersion,
      extensionObj?.packageJSON.version
    );
    assert.equal(reportObj.systemInfo.language, vscode.env.language);
    assert.equal(reportObj.systemInfo.platform, os.platform());
    assert.equal(reportObj.systemInfo.systemName, os.release());
    assert.equal(reportObj.systemInfo.shell, vscode.env.shell);
    assert.equal(reportObj.systemInfo.vscodeVersion, vscode.version);
    assert.equal(reportObj.systemInfo.appName, vscode.env.appName);
  });

  test("Wrong access to ESP-IDF path", async () => {
    reportObj.configurationSettings.espIdfPath = "/some/non-existing-path";
    await getConfigurationAccess(reportObj);
    assert.equal(reportObj.configurationAccess.espIdfPath, false);
  });

  test("Wrong version of ESP-IDF", async () => {
    reportObj.configurationSettings.espIdfPath = "/some/non-existing-path";
    await getEspIdfVersion(reportObj);
    assert.equal(reportObj.espIdfVersion.result, "x.x");
  });

  test("Wrong access to Python path", async () => {
    reportObj.configurationSettings.pythonBinPath = "/some/non-existing-path";
    await getConfigurationAccess(reportObj);
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
    reportObj.configurationSettings.espIdfPath = "/some/non-existing-path";
    await checkEspIdfRequirements(reportObj, mockUpContext);
    assert.equal(
      reportObj.idfCheckRequirements.result,
      "Error: /some/non-existing-path/requirements.txt doesn't exist."
    );
  });

  test("launch.json", async () => {
    const templateLaunchJson = await readFile(
      join(__dirname, "../../templates/.vscode/launch.json"),
      "utf8"
    );
    await checkLaunchJson(reportObj);
    assert.equal(reportObj.launchJson, templateLaunchJson);
  });

  test("c_cpp_properties.json", async () => {
    const templateLaunchJson = await readFile(
      join(__dirname, "../../templates/.vscode/c_cpp_properties.json"),
      "utf8"
    );
    await checkCCppPropertiesJson(reportObj);
    assert.equal(reportObj.cCppPropertiesJson, templateLaunchJson);
  });

  test("Test configuration settings", async () => {
    const settingsJsonObj = await readJSON(
      join(__dirname, "../../testFiles/testWorkspace/.vscode/settings.json")
    );
    await getConfigurationSettings(
      reportObj,
      vscode.workspace.getWorkspaceFolder(
        vscode.Uri.file(join(__dirname, "../../testFiles/testWorkspace"))
      )
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
    reportObj.configurationSettings.espIdfPath = process.env.IDF_PATH || "";
    await checkEspIdfRequirements(reportObj, mockUpContext);
    assert.equal(
      reportObj.idfCheckRequirements.result,
      `Python requirements are satisfied.`
    );
  });

  test("Good configuration access", async () => {
    reportObj.configurationSettings.pythonBinPath = `${process.env.IDF_PYTHON_ENV_PATH}/bin/python`;
    reportObj.configurationSettings.espIdfPath = process.env.IDF_PATH || "";
    reportObj.configurationSettings.customExtraPaths = process.env.PATH
      ? process.env.PATH.replace(delimiter + process.env.OLD_PATH, "")
      : "";
    await getConfigurationAccess(reportObj);
    assert.equal(reportObj.configurationAccess.pythonBinPath, true);
    assert.equal(reportObj.configurationAccess.espIdfPath, true);
    for (let toolPath in reportObj.configurationAccess.espIdfToolsPaths) {
      if (
        process.env.IDF_TOOLS_PATH &&
        toolPath.indexOf(process.env.IDF_TOOLS_PATH) !== -1
      ) {
        assert.equal(
          reportObj.configurationAccess.espIdfToolsPaths[toolPath],
          true
        );
      }
    }
  });

  test("Match ESP-IDF version", async () => {
    reportObj.configurationSettings.espIdfPath = process.env.IDF_PATH || "";
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
    if (process.env.PY_PKGS) {
      const expectedPyPkgs = JSON.parse(process.env.PY_PKGS);
      await getPythonPackages(reportObj, mockUpContext);
      assert.deepEqual(
        reportObj.configurationSettings.pythonPackages,
        expectedPyPkgs
      );
    }
  });

  test("Match written report", async () => {
    const actualReport = await writeTextReport(reportObj, mockUpContext);
    assert.ok(actualReport.includes("CONFIGURATION SUMMARY"));
    assert.ok(actualReport.includes("Overall status:"));
    assert.ok(actualReport.includes("Configuration checks"));
    assert.ok(actualReport.includes("Additional extension settings"));
    assert.ok(
      !actualReport.includes(
        "-------------------------------------------------------- Configurations access -------------------------------------------------------------"
      )
    );
    assert.ok(reportObj.reportSummary);
    assert.ok(
      ["PASS", "FAIL", "WARN"].includes(reportObj.reportSummary.overall)
    );
  });
});
