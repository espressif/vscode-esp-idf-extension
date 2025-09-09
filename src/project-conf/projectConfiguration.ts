/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 17th January 2023 2:17:09 pm
 * Copyright 2023 Espressif Systems (Shanghai) CO LTD
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

// Legacy interface for backward compatibility
export interface ProjectConfElement {
  build: {
    compileArgs: string[];
    ninjaArgs: string[];
    buildDirectoryPath: string;
    sdkconfigDefaults: string[];
    sdkconfigFilePath: string;
  };
  env: { [key: string]: string };
  idfTarget: string;
  flashBaudRate: string;
  monitorBaudRate: string;
  openOCD: {
    debugLevel: number;
    configs: string[];
    args: string[];
  };
  tasks: {
    preBuild: string;
    preFlash: string;
    postBuild: string;
    postFlash: string;
  };
}

// New CMakePresets interfaces
export interface CMakeVersion {
  major: number;
  minor: number;
  patch: number;
}

export interface ESPIDFSettings {
  type: "compileArgs" | "ninjaArgs" | "flashBaudRate" | "monitorBaudRate" | "openOCD" | "tasks";
  value: any;
}

export interface ESPIDFVendorSettings {
  "espressif/vscode-esp-idf": {
    settings: ESPIDFSettings[];
  };
}

export interface ConfigurePreset {
  name: string;
  binaryDir?: string;
  cacheVariables?: {
    IDF_TARGET?: string;
    SDKCONFIG_DEFAULTS?: string;
    SDKCONFIG?: string;
    [key: string]: any;
  };
  environment?: { [key: string]: string };
  vendor?: ESPIDFVendorSettings;
}

export interface BuildPreset {
  name: string;
  configurePreset: string;
}

export interface CMakePresets {
  $schema?: string;
  version: number;
  cmakeMinimumRequired?: CMakeVersion;
  configurePresets?: ConfigurePreset[];
  buildPresets?: BuildPreset[]; // Optional - not used by ESP-IDF extension
}
