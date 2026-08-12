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
import { pathExists, readJson, writeJson } from "fs-extra";
import { ESP } from "../config";
import { Logger } from "../logger/logger";
import { readParameter } from "../idfConfiguration";
import { CMakePresets, ConfigurePreset } from "./projectConfiguration";
import { getESPIDFSettingValue, setESPIDFSettingValue } from "./presetSettings";
import { toCMakePresetMacros } from "./presetSubstitution";
import { getProjectConfigurationElements } from "./presetsReader";

/**
 * Stores the target of the selected preset. IDF_TARGET belongs to cacheVariables
 * because CMake reads it, not to the preset environment.
 */
export async function updateCurrentProfileIdfTarget(
  idfTarget: string,
  workspaceFolder: Uri
) {
  await updateCurrentProjectConfiguration(workspaceFolder, (preset) => {
    preset.cacheVariables = { ...preset.cacheVariables, IDF_TARGET: idfTarget };
    return preset;
  });
}

export async function updateCurrentProfileOpenOcdConfigs(
  configs: string[],
  workspaceFolder: Uri
) {
  const debugLevelSetting = readParameter(
    "idf.openOcdDebugLevel",
    workspaceFolder
  );
  // readParameter yields "" when neither the preset nor the settings define it.
  const debugLevel =
    typeof debugLevelSetting === "number"
      ? debugLevelSetting
      : parseInt(String(debugLevelSetting), 10);

  await updateCurrentProjectConfiguration(workspaceFolder, (preset) => {
    const currentOpenOcd = getESPIDFSettingValue(preset, "openOCD");
    return setESPIDFSettingValue(preset, "openOCD", {
      debugLevel: Number.isFinite(debugLevel)
        ? debugLevel
        : currentOpenOcd?.debugLevel ?? 2,
      configs,
      args: currentOpenOcd?.args ?? [],
    });
  });
}

/**
 * IDF_TARGET is skipped because it is kept in cacheVariables by
 * updateCurrentProfileIdfTarget.
 */
export async function updateCurrentProfileCustomExtraVars(
  customVars: { [key: string]: string },
  workspaceFolder: Uri
) {
  const { IDF_TARGET, ...environmentVars } = customVars;

  await updateCurrentProjectConfiguration(workspaceFolder, (preset) => {
    preset.environment = { ...preset.environment, ...environmentVars };
    return preset;
  });
}

/**
 * Applies an update to the selected preset in the file that declares it, then
 * refreshes the in-memory store with the resolved result.
 *
 * The preset handed to updateFunction is the raw one read from disk, so that
 * writing it back does not bake expanded macros such as ${sourceDir} into the file.
 */
export async function updateCurrentProjectConfiguration(
  workspaceFolder: Uri,
  updateFunction: (preset: ConfigurePreset) => ConfigurePreset
): Promise<void> {
  const selectedConfig = ESP.ProjectConfiguration.store.get<string>(
    ESP.ProjectConfiguration.SELECTED_CONFIG
  );

  if (!selectedConfig) {
    return;
  }

  const target = await locatePreset(workspaceFolder, selectedConfig);

  if (!target) {
    const err = new Error(
      `Configuration preset "${selectedConfig}" not found in project configuration files. Please check your CMakePresets configurePresets section.`
    );
    Logger.errorNotify(
      err.message,
      err,
      "updateCurrentProjectConfiguration project-conf"
    );
    return;
  }

  const updatedPreset = updateFunction(target.preset);
  target.document.configurePresets[target.index] = normalizePresetForWrite(
    updatedPreset
  );
  await writePresetsDocument(target.filePath, target.document);

  let resolvedPresets: { [key: string]: ConfigurePreset } = {};
  try {
    resolvedPresets = await getProjectConfigurationElements(
      workspaceFolder,
      true
    );
  } catch (error) {
    Logger.errorNotify(
      error.message,
      error,
      "updateCurrentProjectConfiguration project-conf"
    );
  }
  ESP.ProjectConfiguration.store.set(
    selectedConfig,
    resolvedPresets[selectedConfig] ?? updatedPreset
  );
}

/**
 * Writes every given preset to CMakePresets.json, replacing its configurePresets.
 */
export async function saveProjectConfFile(
  workspaceFolder: Uri,
  presets: { [key: string]: ConfigurePreset }
) {
  const filePath = Uri.joinPath(
    workspaceFolder,
    ESP.ProjectConfiguration.PROJECT_CONFIGURATION_FILENAME
  );

  await writePresetsDocument(filePath, {
    version: ESP.CMakePresets.CMAKE_PRESET_VERSION,
    cmakeMinimumRequired: ESP.CMakePresets.CMAKE_PRESET_MINIMUM_REQUIRED,
    configurePresets: Object.values(presets).map(normalizePresetForWrite),
  });
}

export type StarterPresetsOutcome =
  | "created"
  | "presetsAdded"
  | "alreadyDefined"
  | "unreadable";

/**
 * Mirrors the presets of the ESP-IDF multi_config example, without its
 * SDKCONFIG_DEFAULTS entries: those name sdkconfig files a fresh project does not
 * have, and CMake fails the build when they are missing.
 */
function starterConfigurePresets(): ConfigurePreset[] {
  return [
    {
      name: "default",
      displayName: "Default (development)",
      description: "Development configuration",
      binaryDir: "${sourceDir}/build/default",
      cacheVariables: { SDKCONFIG: "${sourceDir}/build/default/sdkconfig" },
    },
    {
      name: "production",
      displayName: "Production",
      description: "Production configuration",
      binaryDir: "${sourceDir}/build/production",
      cacheVariables: { SDKCONFIG: "${sourceDir}/build/production/sdkconfig" },
    },
  ];
}

/**
 * Gives CMakePresets.json a pair of buildable presets to copy from, because an
 * empty configurePresets array leaves nothing to learn the format from.
 *
 * Existing presets are never touched, and neither is a file that fails to parse,
 * so a malformed file is reported rather than overwritten.
 */
export async function createStarterPresetsFile(
  workspaceFolder: Uri
): Promise<{ filePath: Uri; outcome: StarterPresetsOutcome }> {
  const fileName = ESP.ProjectConfiguration.PROJECT_CONFIGURATION_FILENAME;
  const filePath = Uri.joinPath(workspaceFolder, fileName);

  if (!(await pathExists(filePath.fsPath))) {
    await writePresetsDocument(filePath, {
      version: ESP.CMakePresets.CMAKE_PRESET_VERSION,
      cmakeMinimumRequired: ESP.CMakePresets.CMAKE_PRESET_MINIMUM_REQUIRED,
      configurePresets: starterConfigurePresets(),
    });
    return { filePath, outcome: "created" };
  }

  const existing = await readPresetsDocument(filePath, fileName);
  if (!existing) {
    return { filePath, outcome: "unreadable" };
  }
  if (existing.configurePresets.length > 0) {
    return { filePath, outcome: "alreadyDefined" };
  }

  await writePresetsDocument(filePath, {
    ...existing,
    version: existing.version ?? ESP.CMakePresets.CMAKE_PRESET_VERSION,
    configurePresets: starterConfigurePresets(),
  });
  return { filePath, outcome: "presetsAdded" };
}

interface LocatedPreset {
  filePath: Uri;
  document: CMakePresets & { configurePresets: ConfigurePreset[] };
  index: number;
  preset: ConfigurePreset;
}

/**
 * Finds the file that declares a preset. A name can only be declared in one of the
 * two files, so the order they are searched in does not change the result.
 */
async function locatePreset(
  workspaceFolder: Uri,
  presetName: string
): Promise<LocatedPreset | undefined> {
  const candidateFileNames = [
    ESP.ProjectConfiguration.USER_CONFIGURATION_FILENAME,
    ESP.ProjectConfiguration.PROJECT_CONFIGURATION_FILENAME,
  ];

  for (const fileName of candidateFileNames) {
    const filePath = Uri.joinPath(workspaceFolder, fileName);
    const document = await readPresetsDocument(filePath, fileName);
    if (!document) {
      continue;
    }
    const index = document.configurePresets.findIndex(
      (preset) => preset.name === presetName
    );
    if (index > -1) {
      return {
        filePath,
        document,
        index,
        preset: document.configurePresets[index],
      };
    }
  }

  return undefined;
}

async function readPresetsDocument(
  filePath: Uri,
  fileName: string
): Promise<
  (CMakePresets & { configurePresets: ConfigurePreset[] }) | undefined
> {
  if (!(await pathExists(filePath.fsPath))) {
    return undefined;
  }
  try {
    const document = (await readJson(filePath.fsPath)) as CMakePresets;
    return { ...document, configurePresets: document.configurePresets ?? [] };
  } catch (error) {
    Logger.error(
      `Error reading ${fileName}: ${error.message}`,
      error,
      "readPresetsDocument project-conf"
    );
    return undefined;
  }
}

async function writePresetsDocument(filePath: Uri, document: CMakePresets) {
  await writeJson(filePath.fsPath, document, { spaces: 2 });
}

/**
 * CMake parses binaryDir and the cache variables itself and only understands its
 * own macros, so VS Code spellings are rewritten before the preset hits the disk.
 */
function normalizePresetForWrite(preset: ConfigurePreset): ConfigurePreset {
  const normalized: ConfigurePreset = {
    ...preset,
    binaryDir: toCMakePresetMacros(preset.binaryDir),
  };

  if (preset.cacheVariables) {
    normalized.cacheVariables = { ...preset.cacheVariables };
    for (const key of ["SDKCONFIG", "SDKCONFIG_DEFAULTS"]) {
      if (typeof normalized.cacheVariables[key] === "string") {
        normalized.cacheVariables[key] = toCMakePresetMacros(
          normalized.cacheVariables[key]
        );
      }
    }
  }

  return normalized;
}
