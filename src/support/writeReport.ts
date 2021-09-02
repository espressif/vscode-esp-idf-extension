/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 30th December 2020 5:07:59 pm
 * Copyright 2020 Espressif Systems (Shanghai) CO LTD
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
import { writeFile, writeJson } from "fs-extra";
import { EOL } from "os";
import { join } from "path";
import * as vscode from "vscode";
import { reportObj } from "./types";

export async function writeTextReport(
  reportedResult: reportObj,
  context: vscode.ExtensionContext
) {
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
  output += `---------------------------------------------------- Extension configuration settings ------------------------------------------------------${EOL}`;
  output += `ESP-ADF Path (idf.espAdfPath) ${reportedResult.configurationSettings.espAdfPath}${EOL}`;
  output += `ESP-IDF Path (idf.espIdfPath) ${reportedResult.configurationSettings.espIdfPath}${EOL}`;
  output += `ESP-MDF Path (idf.espMdfPath) ${reportedResult.configurationSettings.espMdfPath}${EOL}`;
  output += `Custom extra paths (idf.customExtraPaths) ${reportedResult.configurationSettings.customExtraPaths}${EOL}`;
  output += `Custom extra vars (idf.customExtraVars) ${reportedResult.configurationSettings.customExtraVars}${EOL}`;
  output += `Virtual env Python Path (idf.pythonBinPath) ${reportedResult.configurationSettings.pythonBinPath}${EOL}`;
  output += `Serial port (idf.port) ${reportedResult.configurationSettings.serialPort}${EOL}`;
  output += `OpenOCD Configs (idf.openOcdConfigs) ${reportedResult.configurationSettings.openOcdConfigs}${EOL}`;
  output += `ESP-IDF Tools Path (idf.toolsPath) ${reportedResult.configurationSettings.toolsPath}${EOL}`;
  output += `Git Path (idf.gitPath) ${reportedResult.configurationSettings.gitPath}${EOL}`;
  output += `-------------------------------------------------------- Configurations access -------------------------------------------------------------${EOL}`;
  output += `Access to ESP-ADF Path (idf.espAdfPath) ${reportedResult.configurationAccess.espAdfPath}${EOL}`;
  output += `Access to ESP-IDF Path (idf.espIdfPath) ${reportedResult.configurationAccess.espIdfPath}${EOL}`;
  output += `Access to ESP-MDF Path (idf.espMdfPath) ${reportedResult.configurationAccess.espMdfPath}${EOL}`;
  output += `Access to ESP-IDF Custom extra paths${EOL}`;
  for (let key in reportedResult.configurationAccess.espIdfToolsPaths) {
    output += `Access to ${key}: ${reportedResult.configurationAccess.espIdfToolsPaths[key]}${EOL}`;
  }
  output += `Access to Virtual env Python Path (idf.pythonBinPath) ${reportedResult.configurationAccess.pythonBinPath}${EOL}`;
  output += `Access to CMake in environment PATH ${reportedResult.configurationAccess.cmakeInEnv}${EOL}`;
  output += `Access to Ninja in environment PATH ${reportedResult.configurationAccess.ninjaInEnv}${EOL}`;
  output += `Access to ESP-IDF Tools Path (idf.toolsPath) ${reportedResult.configurationAccess.toolsPath}${EOL}`;
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
  output += `-------------------------------------------------- Python packages in idf.pythonBinPath ----------------------------------------------------${EOL}`;
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
  output += `---------------------------------------------------- Check extension requirements.txt ------------------------------------------------------${EOL}`;
  output += `Check Extension Python packages ${
    reportedResult.extensionRequirements.result
      ? reportedResult.extensionRequirements.result
      : reportedResult.extensionRequirements.output
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
    output += `Latest error at ${
      reportedResult.latestError.message
        ? reportedResult.latestError.message
        : "Unknown error in ESP-IDF doctor command"
    }${EOL}`;
  }
  output += lineBreak;
  const resultFile = join(context.extensionPath, "report.txt");
  const resultJson = join(context.extensionPath, "report.json");
  await writeFile(resultFile, output);
  await writeJson(resultJson, reportedResult, {
    spaces: vscode.workspace.getConfiguration().get("editor.tabSize") || 2,
  });
  return output;
}
