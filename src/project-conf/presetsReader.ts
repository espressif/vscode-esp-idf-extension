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
import { pathExists, readJson } from "fs-extra";
import { ESP } from "../config";
import { Logger } from "../logger/logger";
import { CMakePresets, ConfigurePreset } from "./projectConfiguration";
import { resolvePresetInheritance } from "./presetInheritance";
import { processConfigurePresetVariables } from "./presetProcessing";
import { isPresetEnabled } from "./presetCondition";

/**
 * Reads the configure presets of CMakePresets.json and CMakeUserPresets.json,
 * resolves inheritance and expands variables. Presets marked `"hidden": true`
 * stay available as inheritance bases, and presets disabled by their `condition`
 * are dropped, so the result matches what `cmake --list-presets` offers.
 * @param resolvePaths Whether to resolve paths to absolute paths (true for building, false for display)
 * @returns An object mapping preset names to their processed ConfigurePreset.
 */
export async function getProjectConfigurationElements(
  workspaceFolder: Uri,
  resolvePaths: boolean = false
): Promise<{ [key: string]: ConfigurePreset }> {
  const cmakePresetsFilePath = Uri.joinPath(
    workspaceFolder,
    ESP.ProjectConfiguration.PROJECT_CONFIGURATION_FILENAME
  );
  const cmakeUserPresetsFilePath = Uri.joinPath(
    workspaceFolder,
    ESP.ProjectConfiguration.USER_CONFIGURATION_FILENAME
  );

  const allRawPresets = indexPresetsByName([
    {
      fileName: ESP.ProjectConfiguration.PROJECT_CONFIGURATION_FILENAME,
      presets: await readPresetsFile(
        cmakePresetsFilePath,
        ESP.ProjectConfiguration.PROJECT_CONFIGURATION_FILENAME
      ),
    },
    {
      fileName: ESP.ProjectConfiguration.USER_CONFIGURATION_FILENAME,
      presets: await readPresetsFile(
        cmakeUserPresetsFilePath,
        ESP.ProjectConfiguration.USER_CONFIGURATION_FILENAME
      ),
    },
  ]);

  const processedPresets: { [key: string]: ConfigurePreset } = {};
  for (const [name, preset] of Object.entries(allRawPresets)) {
    if (preset.hidden) {
      continue;
    }
    try {
      const resolvedPreset = resolvePresetInheritance(preset, allRawPresets);
      // Conditions are inherited, so they can only be judged once the chain is resolved.
      if (!isPresetEnabled(resolvedPreset, workspaceFolder)) {
        continue;
      }
      processedPresets[name] = processConfigurePresetVariables(
        resolvedPreset,
        workspaceFolder,
        resolvePaths
      );
    } catch (error) {
      Logger.warn(
        `Failed to process configure preset "${name}": ${error.message}`,
        error
      );
    }
  }

  return processedPresets;
}

interface PresetsFileContent {
  fileName: string;
  presets: ConfigurePreset[];
}

/**
 * Keys the presets of both files by name. CMake requires the names to be unique
 * across CMakePresets.json and CMakeUserPresets.json and reads no preset at all
 * when they are not, so a duplicate has to fail the whole read instead of letting
 * one preset silently shadow another.
 */
function indexPresetsByName(
  files: PresetsFileContent[]
): {
  [key: string]: ConfigurePreset;
} {
  const presetsByName: { [key: string]: ConfigurePreset } = {};
  const declaringFileByName: { [key: string]: string } = {};
  const duplicates: string[] = [];

  for (const { fileName, presets } of files) {
    for (const preset of presets) {
      const declaringFile = declaringFileByName[preset.name];
      if (declaringFile) {
        duplicates.push(
          declaringFile === fileName
            ? `"${preset.name}" is declared more than once in ${fileName}`
            : `"${preset.name}" is declared in both ${declaringFile} and ${fileName}`
        );
        continue;
      }
      declaringFileByName[preset.name] = fileName;
      presetsByName[preset.name] = { ...preset };
    }
  }

  if (duplicates.length) {
    throw new Error(
      `Duplicate configure presets: ${duplicates.join(
        "; "
      )}. Preset names must be unique, so no configuration is available until this is fixed.`
    );
  }

  return presetsByName;
}

async function readPresetsFile(
  filePath: Uri,
  fileName: string
): Promise<ConfigurePreset[]> {
  if (!(await pathExists(filePath.fsPath))) {
    return [];
  }

  let configJson: any;
  try {
    configJson = await readJson(filePath.fsPath);
  } catch (error) {
    Logger.errorNotify(
      `Failed to read or parse ${fileName}`,
      error,
      "getProjectConfigurationElements"
    );
    return [];
  }

  if (typeof configJson !== "object" || configJson === null) {
    return [];
  }

  if (configJson.version === undefined || !configJson.configurePresets) {
    Logger.warnNotify(
      `Invalid ${fileName} format detected. Please ensure the file follows the CMakePresets specification.`
    );
    return [];
  }

  return (configJson as CMakePresets).configurePresets.filter((preset) => {
    if (preset && typeof preset.name === "string" && preset.name !== "") {
      return true;
    }
    Logger.warnNotify(
      `Skipping a configure preset without a name in ${fileName}.`
    );
    return false;
  });
}
