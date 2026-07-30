/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 9th July 2026
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

import { ESP } from "../config";
import {
  ConfigurePreset,
  ESPIDFSettings,
  ESPIDFSettingType,
} from "./projectConfiguration";

/**
 * Leaf module: reads and writes the ESP-IDF slice of a ConfigurePreset and maps
 * extension setting ids onto it. Must not import idfConfiguration, which imports
 * this module to resolve settings from the selected preset.
 */

export function getESPIDFSettingValue(
  preset: ConfigurePreset,
  settingType: ESPIDFSettingType
): any {
  const settings =
    preset?.vendor?.[ESP.CMakePresets.ESP_IDF_VENDOR_KEY]?.settings || [];
  return settings.find((s) => s.type === settingType)?.value;
}

/**
 * Replaces a single ESP-IDF vendor setting, creating the vendor section when absent.
 * Mutates and returns the given preset so callers can chain it inside an update function.
 */
export function setESPIDFSettingValue(
  preset: ConfigurePreset,
  settingType: ESPIDFSettingType,
  value: any
): ConfigurePreset {
  const vendorKey = ESP.CMakePresets.ESP_IDF_VENDOR_KEY;
  if (!preset.vendor || !preset.vendor[vendorKey]) {
    preset.vendor = {
      [vendorKey]: {
        schemaVersion: ESP.CMakePresets.CMAKE_PRESET_SCHEMA_VERSION,
        settings: [],
      },
    };
  }
  const vendorSection = preset.vendor[vendorKey];
  vendorSection.schemaVersion = ESP.CMakePresets.CMAKE_PRESET_SCHEMA_VERSION;
  const settings: ESPIDFSettings[] = vendorSection.settings || [];
  vendorSection.settings = [
    ...settings.filter((setting) => setting.type !== settingType),
    { type: settingType, value },
  ];
  return preset;
}

/**
 * The extension settings a configure preset can override, and where each one lives
 * in the preset. Values are returned falsy when the preset does not define them, so
 * that readParameter falls back to the workspace setting.
 */
export function getPresetParameterValue(
  param: string,
  preset: ConfigurePreset
): any {
  if (!preset) {
    return "";
  }
  switch (param) {
    case "idf.cmakeCompilerArgs":
      return orEmpty(getESPIDFSettingValue(preset, "compileArgs"));
    case "idf.ninjaArgs":
      return orEmpty(getESPIDFSettingValue(preset, "ninjaArgs"));
    case "idf.buildPath":
      return preset.binaryDir || "";
    case "idf.sdkconfigDefaults": {
      const sdkconfigDefaults = preset.cacheVariables?.SDKCONFIG_DEFAULTS;
      return sdkconfigDefaults ? sdkconfigDefaults.split(";") : "";
    }
    case "idf.sdkconfigFilePath":
      return preset.cacheVariables?.SDKCONFIG || "";
    case "idf.flashBaudRate":
      return orEmpty(getESPIDFSettingValue(preset, "flashBaudRate"));
    case "idf.monitorBaudRate":
      return orEmpty(getESPIDFSettingValue(preset, "monitorBaudRate"));
    case "idf.openOcdDebugLevel": {
      const debugLevel = getESPIDFSettingValue(preset, "openOCD")?.debugLevel;
      return typeof debugLevel === "number" && debugLevel >= 0
        ? debugLevel
        : "";
    }
    case "idf.openOcdConfigs":
      return orEmpty(getESPIDFSettingValue(preset, "openOCD")?.configs);
    case "idf.openOcdLaunchArgs":
      return orEmpty(getESPIDFSettingValue(preset, "openOCD")?.args);
    case "idf.preBuildTask":
      return orEmpty(getESPIDFSettingValue(preset, "tasks")?.preBuild);
    case "idf.postBuildTask":
      return orEmpty(getESPIDFSettingValue(preset, "tasks")?.postBuild);
    case "idf.preFlashTask":
      return orEmpty(getESPIDFSettingValue(preset, "tasks")?.preFlash);
    case "idf.postFlashTask":
      return orEmpty(getESPIDFSettingValue(preset, "tasks")?.postFlash);
    default:
      return "";
  }
}

/**
 * Environment a preset contributes to idf.customExtraVars. IDF_TARGET lives in
 * cacheVariables because CMake consumes it, but is exposed here as an env var.
 */
export function getPresetCustomExtraVars(
  preset: ConfigurePreset
): { [key: string]: string } {
  const extraVars: { [key: string]: string } = {};
  if (
    preset?.environment &&
    typeof preset.environment === "object" &&
    !Array.isArray(preset.environment)
  ) {
    Object.assign(extraVars, preset.environment);
  }
  if (preset?.cacheVariables?.IDF_TARGET) {
    extraVars["IDF_TARGET"] = preset.cacheVariables.IDF_TARGET;
  }
  return extraVars;
}

/**
 * Empty arrays are truthy in JS, so they would suppress the workspace setting
 * fallback in readParameter. Collapse every empty value to "".
 */
function orEmpty(value: any): any {
  if (Array.isArray(value)) {
    return value.length ? value : "";
  }
  return value || "";
}
