/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 30th December 2020 5:20:44 pm
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
import { reportObj } from "./types";

export const reportedResult: reportObj = {
  configurationSettings: {
    systemEnvPath: undefined,
    espIdfPath: undefined,
    customExtraPaths: undefined,
    customExtraVars: undefined,
    pythonBinPath: undefined,
    pythonPackages: undefined,
    serialPort: undefined,
    openOcdConfigs: undefined,
    toolsPath: undefined,
  },
  configurationAccess: {
    espIdfPath: undefined,
    espIdfToolsPaths: undefined,
    pythonBinPath: undefined,
    cmakeInEnv: undefined,
    ninjaInEnv: undefined,
    toolsPath: undefined,
  },
  debugAdapterRequirements: {
    output: undefined,
    result: undefined,
  },
  espIdfToolsVersions: undefined,
  espIdfVersion: {
    output: undefined,
    result: undefined,
  },
  extensionRequirements: {
    output: undefined,
    result: undefined,
  },
  formatedOutput: undefined,
  gitVersion: {
    output: undefined,
    result: undefined,
  },
  idfCheckRequirements: {
    output: undefined,
    result: undefined,
  },
  latestError: undefined,
  pipVersion: {
    output: undefined,
    result: undefined,
  },
  pythonPackages: {
    output: undefined,
    result: undefined,
  },
  pythonVersion: {
    output: undefined,
    result: undefined,
  },
} as reportObj;
