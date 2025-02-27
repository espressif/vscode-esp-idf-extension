/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 30th December 2020 5:20:44 pm
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
import { reportObj } from "./types";

export function initializeReportObject() {
  const report = new reportObj();
  report.configurationSettings = {
    systemEnvPath: undefined,
    espIdfPath: undefined,
    espAdfPath: undefined,
    espMdfPath: undefined,
    espMatterPath: undefined,
    espHomeKitPath: undefined,
    customExtraPaths: undefined,
    idfExtraVars: undefined,
    userExtraVars: undefined,
    customTerminalExecutable: undefined,
    customTerminalExecutableArgs: undefined,
    notificationMode: undefined,
    pythonBinPath: undefined,
    pythonPackages: undefined,
    serialPort: undefined,
    openOcdConfigs: undefined,
    toolsPath: undefined,
    gitPath: undefined,
  };
  report.cCppPropertiesJson = undefined;
  report.configurationAccess = {
    espIdfPath: undefined,
    espAdfPath: undefined,
    espMdfPath: undefined,
    espMatterPath: undefined,
    espHomeKitPath: undefined,
    espIdfToolsPaths: undefined,
    pythonBinPath: undefined,
    cmakeInEnv: undefined,
    ninjaInEnv: undefined,
    toolsPath: undefined,
  };
  report.configurationSpacesValidation = {
    customExtraPaths: undefined,
    espAdfPath: undefined,
    espIdfPath: undefined,
    espMatterPath: undefined,
    espMdfPath: undefined,
    espHomeKitPath: undefined,
    gitPath: undefined,
    pythonBinPath: undefined,
    toolsPath: undefined,
    systemEnvPath: undefined,
  };
  report.debugAdapterRequirements = {
    output: undefined,
    result: undefined,
  };
  report.espIdfToolsVersions = undefined;
  report.espIdfVersion = {
    output: undefined,
    result: undefined,
  };
  report.formatedOutput = undefined;
  report.gitVersion = {
    output: undefined,
    result: undefined,
  };
  report.idfCheckRequirements = {
    output: undefined,
    result: undefined,
  };
  report.launchJson = undefined;
  report.latestError = undefined;
  report.pipVersion = {
    output: undefined,
    result: undefined,
  };
  report.pythonPackages = {
    output: undefined,
    result: undefined,
  };
  report.pythonVersion = {
    output: undefined,
    result: undefined,
  };
  report.systemInfo = {
    architecture: undefined,
    envIdfPythonEnvPath: undefined,
    envPath: undefined,
    envPython: undefined,
    extensionVersion: undefined,
    language: undefined,
    shell: undefined,
    platform: undefined,
    systemName: undefined,
    vscodeVersion: undefined,
  };
  report.workspaceFolder = undefined;
  report.projectConfigurations = {};
  return report;
}
