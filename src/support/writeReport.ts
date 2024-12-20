/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 30th December 2020 5:07:59 pm
 * Copyright 2020 Espressif Systems (Shanghai) CO LTD
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
import { pathExists, readFile, writeFile, writeJson } from "fs-extra";
import { EOL } from "os";
import { join } from "path";
import * as vscode from "vscode";
import { Logger } from "../logger/logger";
import { reportObj } from "./types";

export async function writeTextReport(
  reportedResult: reportObj,
  context: vscode.ExtensionContext
) {
  reportedResult = replaceUserPath(reportedResult);

  let output = `---------------------------------------------- ESP-IDF Extension for Visual Studio Code report ---------------------------------------------${EOL}`;
  const lineBreak = `--------------------------------------------------------------------------------------------------------------------------------------------${EOL}`;
  output += `OS ${reportedResult.systemInfo.platform} ${reportedResult.systemInfo.architecture} ${reportedResult.systemInfo.systemName} ${EOL}`;
  output += `System environment variable IDF_PYTHON_ENV_PATH ${EOL} ${reportedResult.systemInfo.envIdfPythonEnvPath} ${EOL}`;
  output += `System environment variable PATH ${EOL} ${reportedResult.systemInfo.envPath} ${EOL}`;
  output += `System environment variable PYTHON ${EOL} ${reportedResult.systemInfo.envPython} ${EOL}`;
  output += `Visual Studio Code version ${reportedResult.systemInfo.vscodeVersion} ${EOL}`;
  output += `Visual Studio Code language ${reportedResult.systemInfo.language} ${EOL}`;
  output += `Visual Studio Code shell ${reportedResult.systemInfo.shell} ${EOL}`;
  output += `ESP-IDF Extension version ${reportedResult.systemInfo.extensionVersion} ${EOL}`;
  output += `Workspace folder ${reportedResult.workspaceFolder} ${EOL}`;
  output += `---------------------------------------------------- Extension configuration settings ------------------------------------------------------${EOL}`;
  output += `ESP-ADF Path (idf.espAdfPath) ${reportedResult.configurationSettings.espAdfPath}${EOL}`;
  output += `ESP-IDF Path (idf.espIdfPath) ${reportedResult.configurationSettings.espIdfPath}${EOL}`;
  output += `ESP-MDF Path (idf.espMdfPath) ${reportedResult.configurationSettings.espMdfPath}${EOL}`;
  output += `ESP-Matter Path (idf.espMatterPath) ${reportedResult.configurationSettings.espMatterPath}${EOL}`;
  output += `ESP-HomeKit-SDK Path (idf.espHomeKitSdkPath) ${reportedResult.configurationSettings.espHomeKitPath}${EOL}`;
  output += `Custom extra paths ${reportedResult.configurationSettings.customExtraPaths}${EOL}`;
  if (
    reportedResult.configurationSettings.idfExtraVars &&
    Object.keys(reportedResult.configurationSettings.idfExtraVars)
  ) {
    output += `ESP-IDF extra vars${EOL}`;
    for (let key in reportedResult.configurationSettings.idfExtraVars) {
      output += `    ${key}: ${reportedResult.configurationSettings.idfExtraVars[key]}${EOL}`;
    }
  }
  if (
    reportedResult.configurationSettings.userExtraVars &&
    Object.keys(reportedResult.configurationSettings.userExtraVars)
  ) {
    output += `User extra vars (idf.customExtraVars)${EOL}`;
    for (let key in reportedResult.configurationSettings.userExtraVars) {
      output += `    ${key}: ${reportedResult.configurationSettings.userExtraVars[key]}${EOL}`;
    }
  }
  output += `Virtual environment Python path (computed) ${reportedResult.configurationSettings.pythonBinPath}${EOL}`;
  output += `Serial port (idf.port) ${reportedResult.configurationSettings.serialPort}${EOL}`;
  output += `OpenOCD Configs (idf.openOcdConfigs) ${reportedResult.configurationSettings.openOcdConfigs}${EOL}`;
  output += `ESP-IDF Tools Path (idf.toolsPath) ${reportedResult.configurationSettings.toolsPath}${EOL}`;
  output += `Git Path (idf.gitPath) ${reportedResult.configurationSettings.gitPath}${EOL}`;
  output += `Notification Mode (idf.notificationMode) ${reportedResult.configurationSettings.notificationMode}${EOL}`;
  if (reportedResult.configurationSettings.customTerminalExecutable) {
    output += `Custom terminal executable (idf.customTerminalExecutable) ${reportedResult.configurationSettings.customTerminalExecutable}${EOL}`;
  }
  if (
    reportedResult.configurationSettings.customTerminalExecutableArgs &&
    reportedResult.configurationSettings.customTerminalExecutableArgs.length
  ) {
    output += `Custom terminal executable args (idf.customTerminalExecutableArgs)${reportedResult.configurationSettings.customTerminalExecutableArgs}${EOL}`;
  }
  output += `-------------------------------------------------------- Configurations access -------------------------------------------------------------${EOL}`;
  output += `Access to ESP-ADF Path (idf.espAdfPath) ${reportedResult.configurationAccess.espAdfPath}${EOL}`;
  output += `Access to ESP-IDF Path (idf.espIdfPath) ${reportedResult.configurationAccess.espIdfPath}${EOL}`;
  output += `Access to ESP-MDF Path (idf.espMdfPath) ${reportedResult.configurationAccess.espMdfPath}${EOL}`;
  output += `Access to ESP-Matter Path (idf.espMatterPath) ${reportedResult.configurationAccess.espMatterPath}${EOL}`;
  output += `Access to ESP-HomeKit Path (idf.espHomeKitSdkPath) ${reportedResult.configurationAccess.espHomeKitPath}${EOL}`;
  output += `Access to ESP-IDF Custom extra paths${EOL}`;
  for (let key in reportedResult.configurationAccess.espIdfToolsPaths) {
    output += `Access to ${key}: ${reportedResult.configurationAccess.espIdfToolsPaths[key]}${EOL}`;
  }
  output += `Access to Virtual environment Python path (computed) ${reportedResult.configurationAccess.pythonBinPath}${EOL}`;
  output += `Access to CMake in environment PATH ${reportedResult.configurationAccess.cmakeInEnv}${EOL}`;
  output += `Access to Ninja in environment PATH ${reportedResult.configurationAccess.ninjaInEnv}${EOL}`;
  output += `Access to ESP-IDF Tools Path (idf.toolsPath) ${reportedResult.configurationAccess.toolsPath}${EOL}`;
  output += `-------------------------------------------------------- Configurations has spaces -------------------------------------------------------------${EOL}`;
  output += `Spaces in system environment Path ${reportedResult.configurationSpacesValidation.systemEnvPath}${EOL}`;
  output += `Spaces in ESP-ADF Path (idf.espAdfPath) ${reportedResult.configurationSpacesValidation.espAdfPath}${EOL}`;
  output += `Spaces in ESP-IDF Path (idf.espIdfPath) ${reportedResult.configurationSpacesValidation.espIdfPath}${EOL}`;
  output += `Spaces in ESP-MDF Path (idf.espMdfPath) ${reportedResult.configurationSpacesValidation.espMdfPath}${EOL}`;
  output += `Spaces in ESP-Matter Path (idf.espMatterPath) ${reportedResult.configurationSpacesValidation.espMatterPath}${EOL}`;
  output += `Spaces in ESP-HomeKit-SDK Path (idf.espHomeKitSdkPath) ${reportedResult.configurationSpacesValidation.espHomeKitPath}${EOL}`;
  output += `Spaces in ESP-IDF Custom extra paths${EOL}`;
  for (let key in reportedResult.configurationSpacesValidation
    .customExtraPaths) {
    output += `Spaces in ${key}: ${reportedResult.configurationSpacesValidation.customExtraPaths[key]}${EOL}`;
  }
  output += `Spaces in Virtual environment Python path (computed) ${reportedResult.configurationSpacesValidation.pythonBinPath}${EOL}`;
  output += `Spaces in ESP-IDF Tools Path (idf.toolsPath) ${reportedResult.configurationSpacesValidation.toolsPath}${EOL}`;
  output += `----------------------------------------------------------- Executables Versions -----------------------------------------------------------${EOL}`;
  output += `Git version ${
    reportedResult.gitVersion.result
      ? reportedResult.gitVersion.result
      : reportedResult.gitVersion.output
  }${EOL}`;
  output += `ESP-IDF version ${
    reportedResult.espIdfVersion.result
      ? reportedResult.espIdfVersion.result
      : reportedResult.espIdfVersion.output
  }${EOL}`;
  output += `Python version ${
    reportedResult.pythonVersion.result
      ? reportedResult.pythonVersion.result
      : reportedResult.pythonVersion.output
  }${EOL}`;
  output += `Python's pip version ${
    reportedResult.pipVersion.result
      ? reportedResult.pipVersion.result
      : reportedResult.pipVersion.output
  }${EOL}`;
  output += `-------------------------------------------------- Project configuration settings ----------------------------------------------------------${EOL}`;
  if (reportedResult.selectedProjectConfiguration) {
    output += `Selected configuration: ${reportedResult.selectedProjectConfiguration}${EOL}${EOL}`;
  }
  if (reportedResult.projectConfigurations) {
    for (let key of Object.keys(reportedResult.projectConfigurations)) {
      output += `Configuration name: ${key}${EOL}`;
      if (reportedResult.projectConfigurations[key].build) {
        output += `---- Build section ----${EOL}`;
        output += `     Compile Arguments: ${reportedResult.projectConfigurations[key].build.compileArgs}${EOL}`;
        output += `     Ninja Arguments: ${reportedResult.projectConfigurations[key].build.ninjaArgs}${EOL}`;
        output += `     Build directory path: ${reportedResult.projectConfigurations[key].build.buildDirectoryPath}${EOL}`;
        output += `     SDKConfig defaults : ${reportedResult.projectConfigurations[key].build.sdkconfigDefaults}${EOL}`;
      }
      if (reportedResult.projectConfigurations[key].env) {
        output += `---- Environment variables section ----${EOL}`;
        for (const envKey of Object.keys(
          reportedResult.projectConfigurations[key].env
        )) {
          output += `     ${envKey}: ${reportedResult.projectConfigurations[key].env[envKey]}${EOL}`;
        }
      }
      output += `Flash baud rate: ${reportedResult.projectConfigurations[key].flashBaudRate}${EOL}`;
      output += `Monitor baud rate: ${reportedResult.projectConfigurations[key].monitorBaudRate}${EOL}`;

      if (reportedResult.projectConfigurations[key].openOCD) {
        output += `---- OpenOCD section ----${EOL}`;
        output += `     Debug level: ${reportedResult.projectConfigurations[key].openOCD.debugLevel}${EOL}`;
        output += `     Configuration files: ${reportedResult.projectConfigurations[key].openOCD.configs}${EOL}`;
        output += `     Launch arguments: ${reportedResult.projectConfigurations[key].openOCD.args}${EOL}`;
      }

      if (reportedResult.projectConfigurations[key].tasks) {
        output += `---- Tasks section ----${EOL}`;
        output += `     Pre build task: ${reportedResult.projectConfigurations[key].tasks.preBuild}${EOL}`;
        output += `     Post build task: ${reportedResult.projectConfigurations[key].tasks.postBuild}${EOL}`;
        output += `     Pre flash task: ${reportedResult.projectConfigurations[key].tasks.preFlash}${EOL}`;
        output += `     Post flash task: ${reportedResult.projectConfigurations[key].tasks.postFlash}${EOL}`;
      }
    }
  }
  output += `-------------------------------------------------- Python packages in Virtual environment Python path (computed) ---------------------------${EOL}`;
  if (reportedResult.configurationSettings.pythonPackages) {
    for (let pkg of reportedResult.configurationSettings.pythonPackages) {
      output += `${pkg.name} version: ${pkg.version}${EOL}`;
    }
  } else {
    output += `Python packages ${
      reportedResult.pythonPackages.result
        ? reportedResult.pythonPackages.result
        : reportedResult.pythonPackages.output
    }${EOL}`;
  }
  output += `---------------------------------------------------- Check ESP-IDF python requirements.txt -------------------------------------------------${EOL}`;
  output += `Check ESP-IDF Python packages ${
    reportedResult.idfCheckRequirements.result
      ? reportedResult.idfCheckRequirements.result
      : reportedResult.idfCheckRequirements.output
  }${EOL}`;
  output += `---------------------------------------------------- Check ESP-IDF debug adapter requirements.txt ------------------------------------------${EOL}`;
  output += `Check Debug AdapterPython packages ${
    reportedResult.debugAdapterRequirements.result
      ? reportedResult.debugAdapterRequirements.result
      : reportedResult.debugAdapterRequirements.output
  }${EOL}`;
  if (reportedResult.launchJson) {
    output += `---------------------------------------------------- Visual Studio Code launch.json --------------------------------------------------------${EOL}`;
    output += `${reportedResult.launchJson} ${EOL}`;
  }
  if (reportedResult.cCppPropertiesJson) {
    output += `---------------------------------------------------- Visual Studio Code c_cpp_properties.json ----------------------------------------------${EOL}`;
    output += `${reportedResult.cCppPropertiesJson} ${EOL}`;
  }
  if (reportedResult.latestError) {
    output += `----------------------------------------------------------- Latest error -----------------------------------------------------------------${EOL}`;
    output +=
      JSON.stringify(
        reportedResult.latestError,
        undefined,
        vscode.workspace.getConfiguration().get("editor.tabSize") || 2
      ) + EOL;
  }
  output += lineBreak;
  const logFile = join(context.extensionPath, "esp_idf_vsc_ext.log");
  const logFileExists = await pathExists(logFile);
  if (logFileExists) {
    const logFileContent = await readFile(logFile, "utf8");
    output += `----------------------------------------------------------- Logfile -----------------------------------------------------------------${EOL}`;
    output += logFileContent + EOL + lineBreak;
  }
  const resultFile = join(context.extensionPath, "report.txt");
  await writeFile(resultFile, output);
  const resultJson = join(context.extensionPath, "report.json");
  await writeJson(resultJson, reportedResult, {
    spaces: vscode.workspace.getConfiguration().get("editor.tabSize") || 2,
  });
  return output;
}

export function replaceUserPath(report: reportObj): reportObj {
  const strReport = JSON.stringify(report);

  // Replacing all home paths (based on OS) with '...' using es6 syntax. Can be replaced with one line using .replaceAll() when we will update the version of ECMAScript to 2021 or higher
  let re = new RegExp(process.env.HOME, "g");
  if (process.env.windir) {
    const reWin = new RegExp("\\\\", "g");
    const result = process.env.HOMEPATH.replace(reWin, "\\\\\\\\");
    re = new RegExp(result, "g");
  }
  const parsedReport = strReport.replace(re, "<HOMEPATH>");

  return JSON.parse(parsedReport);
}
