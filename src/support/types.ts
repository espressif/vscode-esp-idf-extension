/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 30th December 2020 5:19:16 pm
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

export interface ConfigurationAccess {
  espIdfPath: boolean;
  espIdfToolsPaths: { [key: string]: boolean };
  pythonBinPath: boolean;
  cmakeInEnv: boolean;
  ninjaInEnv: boolean;
  toolsPath: boolean;
}
export interface Configuration {
  systemEnvPath: string;
  espIdfPath: string;
  customExtraPaths: string;
  customExtraVars: string;
  pythonBinPath: string;
  pythonPackages: pyPkgVersion[];
  serialPort: string;
  openOcdConfigs: string[];
  toolsPath: string;
}

export interface pyPkgVersion {
  name: string;
  version: string;
}

export interface idfToolResult {
  actual: string;
  doesToolExist: boolean;
  expected: string;
  id: string;
}

export interface execResult {
  output: string;
  result: string;
}

export interface reportObj {
  configurationSettings: Configuration;
  configurationAccess: ConfigurationAccess;
  espIdfToolsVersions: idfToolResult[];
  espIdfVersion: execResult;
  gitVersion: execResult;
  latestError: Error;
  pipVersion: execResult;
  pythonVersion: execResult;
  pythonPackages: execResult;
  idfCheckRequirements: execResult;
  extensionRequirements: execResult;
  debugAdapterRequirements: execResult;
  formatedOutput: string;
}
