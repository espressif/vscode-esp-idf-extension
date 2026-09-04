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
  const report: reportObj = {
    configurationSettings: {
      systemEnvPath: "",
      espIdfPath: "",
      espAdfPath: "",
      flashType: "",
      flashPartitionToUse: "",
      customExtraPaths: "",
      customOpenOcdPath: "",
      idfExtraVars: {},
      userExtraVars: {},
      customTerminalExecutable: "",
      customTerminalExecutableArgs: [],
      notificationMode: "",
      pythonBinPath: "",
      pythonPackages: [],
      serialPort: "",
      openOcdConfigs: [],
      openOCDDebugLevel: "",
      openOcdLaunchArgs: [],
      toolsPath: "",
      gitPath: "",
    },
    configurationAccess: {
      espIdfPath: false,
      espAdfPath: false,
      espIdfToolsPaths: {},
      pythonBinPath: false,
      cmakeInEnv: false,
      ninjaInEnv: false,
      toolsPath: false,
      customOpenOcdPath: false,
    },
    configurationSpacesValidation: {
      customExtraPaths: {},
      espAdfPath: false,
      espIdfPath: false,
      pythonBinPath: false,
      toolsPath: false,
      systemEnvPath: false,
    },
    cCppPropertiesJson: [],
    espIdfSetups: [],
    espIdfToolsVersions: [],
    espIdfVersion: {
      output: "",
      result: "",
    },
    formatedOutput: "",
    idfCheckRequirements: {
      output: "",
      result: "",
    },
    launchJson: "",
    latestError: new Error(""),
    pipVersion: {
      output: "",
      result: "",
    },
    pythonPackages: {
      output: "",
      result: "",
    },
    pythonVersion: {
      output: "",
      result: "",
    },
    systemInfo: {
      architecture: "",
      envIdfPythonEnvPath: "",
      envPath: "",
      envPython: "",
      extensionVersion: "",
      language: "",
      shell: "",
      platform: "",
      systemName: "",
      vscodeVersion: "",
      remoteName: "",
      appName: "",
    },
    workspaceFolder: "",
    projectConfigurations: {},
    selectedProjectConfiguration: "",
  };
  return report;
}
