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

import * as path from "path";
import { Uri } from "vscode";
import { ESP } from "../config";
import {
  ConfigurePreset,
  ESPIDFSettings,
  ESPIDFVendorSettings,
} from "./projectConfiguration";
import { substituteVariablesInConfigurePreset } from "./presetSubstitution";

/**
 * Expands the variables of a raw preset and, when resolvePaths is set, turns its
 * relative paths into absolute ones. Presets are read with resolvePaths off for
 * display and on for anything that ends up in a command line.
 */
export function processConfigurePresetVariables(
  preset: ConfigurePreset,
  workspaceFolder: Uri,
  resolvePaths: boolean
): ConfigurePreset {
  return {
    ...preset,
    binaryDir: preset.binaryDir
      ? processConfigurePresetPath(
          preset.binaryDir,
          workspaceFolder,
          preset,
          resolvePaths
        )
      : undefined,
    cacheVariables: preset.cacheVariables
      ? processConfigurePresetCacheVariables(
          preset.cacheVariables,
          workspaceFolder,
          preset,
          resolvePaths
        )
      : undefined,
    environment: preset.environment
      ? processConfigurePresetEnvironment(
          preset.environment,
          workspaceFolder,
          preset
        )
      : undefined,
    vendor: preset.vendor
      ? processConfigurePresetVendor(preset.vendor, workspaceFolder, preset)
      : undefined,
  };
}

function processConfigurePresetPath(
  pathValue: string,
  workspaceFolder: Uri,
  preset: ConfigurePreset,
  resolvePaths: boolean
): string {
  let processedPath = substituteVariablesInConfigurePreset(
    pathValue,
    workspaceFolder,
    preset
  );

  if (resolvePaths && processedPath && !path.isAbsolute(processedPath)) {
    processedPath = path.join(workspaceFolder.fsPath, processedPath);
  }

  return processedPath || pathValue;
}

function processConfigurePresetCacheVariables(
  cacheVariables: { [key: string]: any },
  workspaceFolder: Uri,
  preset: ConfigurePreset,
  resolvePaths: boolean
): { [key: string]: any } {
  const processedCacheVariables: { [key: string]: any } = {};

  for (const [key, value] of Object.entries(cacheVariables)) {
    if (typeof value !== "string") {
      processedCacheVariables[key] = value;
      continue;
    }

    processedCacheVariables[key] = substituteVariablesInConfigurePreset(
      value,
      workspaceFolder,
      preset
    );

    const isPathVariable = key === "SDKCONFIG" || key.includes("PATH");
    const processedValue = processedCacheVariables[key];
    if (
      resolvePaths &&
      isPathVariable &&
      processedValue &&
      !path.isAbsolute(processedValue)
    ) {
      processedCacheVariables[key] = path.join(
        workspaceFolder.fsPath,
        processedValue
      );
    }
  }

  return processedCacheVariables;
}

function processConfigurePresetEnvironment(
  environment: { [key: string]: string },
  workspaceFolder: Uri,
  preset: ConfigurePreset
): { [key: string]: string } {
  const processedEnvironment: { [key: string]: string } = {};

  for (const [key, value] of Object.entries(environment)) {
    processedEnvironment[key] =
      substituteVariablesInConfigurePreset(value, workspaceFolder, preset) ||
      value;
  }

  return processedEnvironment;
}

function processConfigurePresetVendor(
  vendor: ESPIDFVendorSettings,
  workspaceFolder: Uri,
  preset: ConfigurePreset
): ESPIDFVendorSettings {
  const vendorKey = ESP.CMakePresets.ESP_IDF_VENDOR_KEY;
  const processedSettings: ESPIDFSettings[] = [];

  for (const setting of vendor[vendorKey]?.settings || []) {
    processedSettings.push({
      ...setting,
      value: processSettingValue(setting.value, workspaceFolder, preset),
    });
  }

  return {
    [vendorKey]: {
      schemaVersion: ESP.CMakePresets.CMAKE_PRESET_SCHEMA_VERSION,
      settings: processedSettings,
    },
  };
}

/**
 * Vendor setting values are strings, arrays of strings, or flat objects such as
 * the openOCD entry; only leaf strings need substitution.
 */
function processSettingValue(
  value: any,
  workspaceFolder: Uri,
  preset: ConfigurePreset
): any {
  if (typeof value === "string") {
    return (
      substituteVariablesInConfigurePreset(value, workspaceFolder, preset) ||
      value
    );
  }
  if (Array.isArray(value)) {
    return value.map((item) =>
      processSettingValue(item, workspaceFolder, preset)
    );
  }
  if (typeof value === "object" && value !== null) {
    const processedObject: any = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      processedObject[key] = processSettingValue(
        nestedValue,
        workspaceFolder,
        preset
      );
    }
    return processedObject;
  }
  return value;
}
