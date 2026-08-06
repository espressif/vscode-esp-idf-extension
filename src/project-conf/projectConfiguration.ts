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

export interface CMakeVersion {
  major: number;
  minor: number;
  patch: number;
}

export type ESPIDFSettingType =
  | "compileArgs"
  | "ninjaArgs"
  | "flashBaudRate"
  | "monitorBaudRate"
  | "openOCD"
  | "tasks";

export interface ESPIDFSettings {
  type: ESPIDFSettingType;
  value: any;
}

export interface ESPIDFVendorSettings {
  "espressif/vscode-esp-idf": {
    settings: ESPIDFSettings[];
    schemaVersion?: number;
  };
}

export type PresetConditionType =
  | "const"
  | "equals"
  | "notEquals"
  | "inList"
  | "notInList"
  | "matches"
  | "notMatches"
  | "anyOf"
  | "allOf"
  | "not";

/**
 * Field names follow the CMake Condition object; which ones apply depends on `type`.
 * @see https://cmake.org/cmake/help/latest/manual/cmake-presets.7.html#condition
 */
export interface PresetCondition {
  type: PresetConditionType;
  value?: boolean;
  lhs?: string;
  rhs?: string;
  string?: string;
  list?: string[];
  regex?: string;
  conditions?: PresetCondition[];
  condition?: PresetCondition;
}

export interface ConfigurePreset {
  name: string;
  displayName?: string;
  description?: string;
  inherits?: string | string[];
  /** Base preset meant only for inheritance. Not selectable, mirroring `cmake --list-presets`. */
  hidden?: boolean;
  /** Decides whether the preset applies to the current host. `null` means enabled. */
  condition?: boolean | null | PresetCondition;
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
