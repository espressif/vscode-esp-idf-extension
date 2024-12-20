/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 30th December 2020 5:19:16 pm
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

import { ProjectConfElement } from "../project-conf/projectConfiguration";

export class ConfigurationAccess {
  espIdfPath: boolean;
  espAdfPath: boolean;
  espMdfPath: boolean;
  espMatterPath: boolean;
  espHomeKitPath: boolean;
  espIdfToolsPaths: { [key: string]: boolean };
  pythonBinPath: boolean;
  cmakeInEnv: boolean;
  ninjaInEnv: boolean;
  toolsPath: boolean;
}
export class Configuration {
  systemEnvPath: string;
  espIdfPath: string;
  espAdfPath: string;
  espMdfPath: string;
  espMatterPath: string;
  espHomeKitPath: string;
  customExtraPaths: string;
  idfExtraVars: { [key: string]: string };
  userExtraVars: { [key: string]: string };
  notificationMode: string;
  pythonBinPath: string;
  pythonPackages: pyPkgVersion[];
  serialPort: string;
  openOcdConfigs: string[];
  toolsPath: string;
  gitPath: string;
  customTerminalExecutable: string;
  customTerminalExecutableArgs: string[];
}

export class ConfigurationSpacesValidation {
  systemEnvPath: boolean;
  espIdfPath: boolean;
  espAdfPath: boolean;
  espMdfPath: boolean;
  espMatterPath: boolean;
  espHomeKitPath: boolean;
  customExtraPaths: { [key: string]: boolean };
  pythonBinPath: boolean;
  toolsPath: boolean;
  gitPath: boolean;
}

export class SystemInfo {
  architecture: string;
  envIdfPythonEnvPath: string;
  envPath: string;
  envPython: string;
  extensionVersion: string;
  language: string;
  shell: string;
  platform: string;
  systemName: string;
  vscodeVersion: string;
}

export class pyPkgVersion {
  name: string;
  version: string;
}

export class idfToolResult {
  actual: string;
  doesToolExist: boolean;
  expected: string;
  id: string;
}

export class execResult {
  output: string;
  result: string;
}

export class reportObj {
  configurationSettings: Configuration;
  configurationAccess: ConfigurationAccess;
  configurationSpacesValidation: ConfigurationSpacesValidation;
  espIdfToolsVersions: idfToolResult[];
  espIdfVersion: execResult;
  gitVersion: execResult;
  latestError: Error;
  launchJson: string;
  cCppPropertiesJson: any;
  pipVersion: execResult;
  projectConfigurations: { [key: string]: ProjectConfElement };
  pythonVersion: execResult;
  pythonPackages: execResult;
  idfCheckRequirements: execResult;
  debugAdapterRequirements: execResult;
  formatedOutput: string;
  selectedProjectConfiguration: string;
  systemInfo: SystemInfo;
  workspaceFolder: string;
}
