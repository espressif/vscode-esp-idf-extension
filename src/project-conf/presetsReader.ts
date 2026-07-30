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

/**
 * Reads the configure presets of CMakePresets.json and CMakeUserPresets.json,
 * resolves inheritance and expands variables.
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

  // User presets are read last so that they override project presets of the same name.
  const allRawPresets: { [key: string]: ConfigurePreset } = {
    ...(await readPresetsFile(
      cmakePresetsFilePath,
      ESP.ProjectConfiguration.PROJECT_CONFIGURATION_FILENAME
    )),
    ...(await readPresetsFile(
      cmakeUserPresetsFilePath,
      ESP.ProjectConfiguration.USER_CONFIGURATION_FILENAME
    )),
  };

  const processedPresets: { [key: string]: ConfigurePreset } = {};
  for (const [name, preset] of Object.entries(allRawPresets)) {
    try {
      const resolvedPreset = resolvePresetInheritance(preset, allRawPresets);
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

async function readPresetsFile(
  filePath: Uri,
  fileName: string
): Promise<{ [key: string]: ConfigurePreset }> {
  if (!(await pathExists(filePath.fsPath))) {
    return {};
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
    return {};
  }

  if (typeof configJson !== "object" || configJson === null) {
    return {};
  }

  if (configJson.version === undefined || !configJson.configurePresets) {
    Logger.warnNotify(
      `Invalid ${fileName} format detected. Please ensure the file follows the CMakePresets specification.`
    );
    return {};
  }

  const rawPresets: { [key: string]: ConfigurePreset } = {};
  for (const preset of (configJson as CMakePresets).configurePresets) {
    rawPresets[preset.name] = { ...preset };
  }
  return rawPresets;
}
