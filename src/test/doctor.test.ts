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
import { ProjectConfigStore } from "../project-conf/store";
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
  ESP.ProjectConfiguration.store = ProjectConfigStore.resetForTests(
    mockUpContext
  );
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
    const report = await writeTextReport(reportObj, mockUpContext);
    const { summary, details } = splitDoctorReport(report);
    assert.ok(summary.includes("ISSUES"));
    assert.ok(summary.includes("Active ESP-IDF Setup"));
    assert.ok(summary.includes("All ESP-IDF setups"));
    assert.ok(summary.includes("Overall:"));
    assert.ok(!summary.includes("Python packages in Virtual environment"));
    assert.ok(!summary.includes('"stack":'));
    assert.ok(details.includes("Configuration checks"));
    assert.ok(details.includes("Python packages in Virtual environment"));
    assert.ok(details.includes("Logfile"));
    assert.ok(details.includes("Additional extension settings"));
    assert.ok(
      !summary.includes(
        "-------------------------------------------------------- Configurations access -------------------------------------------------------------"
      )
    );
    assert.ok(!report.includes("report-full.txt"));
    assert.ok(reportObj.reportSummary);
    const overall = reportObj.reportSummary.overall;
    assert.ok(["PASS", "FAIL", "WARN"].includes(overall));
    if (overall === "FAIL") {
      assert.ok(summary.includes("ACTIONS"));
      assert.ok(summary.includes("Open ESP-IDF Installation Manager"));
    } else {
      assert.ok(!summary.includes("ACTIONS"));
    }
  });

  test("Summary hides detail and full report keeps it", async () => {
    const report = initializeReportObject();
    report.configurationSettings.espIdfPath = "/idf/v6.1";
    report.configurationSettings.toolsPath = "/tools";
    report.configurationSettings.pythonBinPath = "/venv/bin/python";
    report.configurationAccess.espIdfPath = true;
    report.configurationAccess.toolsPath = true;
    report.configurationAccess.pythonBinPath = true;
    report.configurationAccess.cmakeInEnv = true;
    report.configurationAccess.ninjaInEnv = true;
    report.espIdfVersion.result = "6.1.0";
    report.pythonVersion.result = "3.13.15";
    report.pipVersion.result = "26.2";
    report.idfCheckRequirements.result = "Python requirements are satisfied.";
    report.configurationSettings.pythonPackages = [
      { name: "widget-pkg", version: "1.2.3" },
    ];

    const passing = await writeTextReport(report, mockUpContext);
    const passingParts = splitDoctorReport(passing);
    assert.equal(report.reportSummary?.overall, "PASS");
    assert.ok(passingParts.summary.includes("ISSUES"));
    assert.ok(passingParts.summary.includes("Active ESP-IDF Setup"));
    assert.ok(passingParts.summary.includes("All ESP-IDF setups"));
    assert.ok(!passing.includes("ACTIONS"));
    assert.ok(!passingParts.summary.includes("widget-pkg version:"));
    assert.ok(passingParts.details.includes("Configuration checks"));
    assert.ok(!passingParts.details.includes("\nIssues\n"));
    assert.ok(passingParts.details.includes("widget-pkg version: 1.2.3"));
    assert.ok(passingParts.details.includes("Logfile"));

    report.configurationSettings.systemEnvPath =
      "/usr/bin:/Applications/VMware Fusion.app/Contents/Public:/usr/sbin";
    report.configurationSpacesValidation.systemEnvPath = true;
    const warning = await writeTextReport(report, mockUpContext);
    const warningParts = splitDoctorReport(warning);
    assert.equal(report.reportSummary?.overall, "WARN");
    assert.ok(!warning.includes("ACTIONS"));
    assert.ok(
      !warningParts.summary.includes("Open ESP-IDF Installation Manager")
    );
    assert.ok(warningParts.summary.includes("VMware Fusion.app"));
    assert.ok(!warningParts.summary.includes("/usr/bin"));
    assert.ok(
      warningParts.summary.includes("[WARN] System PATH contains a space")
    );
    assert.ok(
      !warningParts.details.includes("[WARN] System PATH contains a space")
    );
    assert.ok(!warningParts.details.includes("\nIssues\n"));
    assert.ok(
      warningParts.details.includes(
        "/usr/bin:/Applications/VMware Fusion.app/Contents/Public:/usr/sbin"
      )
    );
  });
});

function splitDoctorReport(
  report: string
): { summary: string; details: string } {
  const marker = "\nDETAILS\n";
  const index = report.indexOf(marker);
  assert.ok(index > 0);
  return {
    summary: report.slice(0, index),
    details: report.slice(index),
  };
}
