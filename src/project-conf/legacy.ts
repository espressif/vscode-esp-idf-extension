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

import { Uri } from "vscode";
import { readJson } from "fs-extra";
import { Logger } from "../common/logger";
import { ESP } from "../config";
import {
  ConfigurePreset,
  ESPIDFSettings,
  ESPIDFSettingType,
} from "./projectConfiguration";
import { saveProjectConfFile } from "./presetsWriter";

/**
 * One-shot conversion of the retired esp_idf_project_configuration.json format.
 * Everything past this point works on CMakePresets only, so this file is the sole
 * place that knows about the old shape.
 */
export interface LegacyProjectConfiguration {
  build?: {
    compileArgs?: string[];
    ninjaArgs?: string[];
    buildDirectoryPath?: string;
    sdkconfigDefaults?: string[];
    sdkconfigFilePath?: string;
  };
  env?: { [key: string]: string };
  idfTarget?: string;
  flashBaudRate?: string;
  monitorBaudRate?: string;
  openOCD?: {
    debugLevel?: number;
    configs?: string[];
    args?: string[];
  };
  tasks?: {
    preBuild?: string;
    preFlash?: string;
    postBuild?: string;
    postFlash?: string;
  };
}

/**
 * Copies every profile of a legacy configuration file into CMakePresets.json.
 * The legacy file is left untouched.
 */
export async function migrateLegacyConfiguration(
  workspaceFolder: Uri,
  legacyFilePath: Uri
): Promise<void> {
  const legacyConfig = await readJson(legacyFilePath.fsPath);

  const presets: { [key: string]: ConfigurePreset } = {};
  for (const [name, profile] of Object.entries(legacyConfig)) {
    if (typeof profile !== "object" || profile === null) {
      Logger.warn(
        `Legacy configuration "${name}" is not an object. Skipping.`,
        new Error("Invalid legacy configuration entry")
      );
      continue;
    }
    presets[name] = legacyConfigToConfigurePreset(
      name,
      profile as LegacyProjectConfiguration
    );
  }

  await saveProjectConfFile(workspaceFolder, presets);

  Logger.info(
    `Successfully migrated ${
      Object.keys(presets).length
    } configurations to CMakePresets.json`
  );
}

/**
 * Structural mapping of one legacy profile onto a configure preset. Variables are
 * copied verbatim: they are expanded when the preset is read, and the writer
 * rewrites the VS Code path macros CMake cannot parse.
 *
 * Empty values are dropped so the generated file stays readable and hand-editable.
 */
export function legacyConfigToConfigurePreset(
  name: string,
  legacyConfig: LegacyProjectConfiguration
): ConfigurePreset {
  const preset: ConfigurePreset = { name };

  const build = legacyConfig.build;

  if (build?.buildDirectoryPath) {
    preset.binaryDir = build.buildDirectoryPath;
  }

  const cacheVariables: { [key: string]: any } = {};
  if (legacyConfig.idfTarget) {
    cacheVariables.IDF_TARGET = legacyConfig.idfTarget;
  }
  if (build?.sdkconfigDefaults?.length) {
    cacheVariables.SDKCONFIG_DEFAULTS = build.sdkconfigDefaults.join(";");
  }
  if (build?.sdkconfigFilePath) {
    cacheVariables.SDKCONFIG = build.sdkconfigFilePath;
  }
  if (Object.keys(cacheVariables).length) {
    preset.cacheVariables = cacheVariables;
  }

  if (legacyConfig.env && Object.keys(legacyConfig.env).length) {
    preset.environment = { ...legacyConfig.env };
  }

  const settings: ESPIDFSettings[] = [];
  const addSetting = (type: ESPIDFSettingType, value: any) => {
    if (value !== undefined) {
      settings.push({ type, value });
    }
  };

  addSetting("compileArgs", nonEmptyArray(build?.compileArgs));
  addSetting("ninjaArgs", nonEmptyArray(build?.ninjaArgs));
  addSetting("flashBaudRate", nonEmptyString(legacyConfig.flashBaudRate));
  addSetting("monitorBaudRate", nonEmptyString(legacyConfig.monitorBaudRate));
  addSetting("openOCD", legacyOpenOcdToSettingValue(legacyConfig.openOCD));
  addSetting("tasks", legacyTasksToSettingValue(legacyConfig.tasks));

  if (settings.length) {
    preset.vendor = {
      [ESP.CMakePresets.ESP_IDF_VENDOR_KEY]: {
        schemaVersion: ESP.CMakePresets.CMAKE_PRESET_SCHEMA_VERSION,
        settings,
      },
    };
  }

  return preset;
}

function legacyOpenOcdToSettingValue(
  openOCD: LegacyProjectConfiguration["openOCD"]
) {
  if (!openOCD) {
    return undefined;
  }

  const value: {
    debugLevel?: number;
    configs?: string[];
    args?: string[];
  } = {};
  // -1 was the legacy "not set" sentinel.
  if (typeof openOCD.debugLevel === "number" && openOCD.debugLevel >= 0) {
    value.debugLevel = openOCD.debugLevel;
  }
  if (openOCD.configs?.length) {
    value.configs = openOCD.configs;
  }
  if (openOCD.args?.length) {
    value.args = openOCD.args;
  }

  return Object.keys(value).length ? value : undefined;
}

function legacyTasksToSettingValue(tasks: LegacyProjectConfiguration["tasks"]) {
  if (!tasks) {
    return undefined;
  }

  const value: { [key: string]: string } = {};
  for (const taskName of ["preBuild", "preFlash", "postBuild", "postFlash"]) {
    const task = tasks[taskName];
    if (typeof task === "string" && task.trim() !== "") {
      value[taskName] = task;
    }
  }

  return Object.keys(value).length ? value : undefined;
}

function nonEmptyArray(value?: string[]): string[] | undefined {
  return value?.length ? value : undefined;
}

function nonEmptyString(value?: string): string | undefined {
  return value && value.trim() !== "" ? value : undefined;
}
