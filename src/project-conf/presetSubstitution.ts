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

import { delimiter } from "path";
import { platform } from "os";
import { Uri } from "vscode";
import { resolveVariables } from "../configuration/idf";
import { ConfigurePreset } from "./projectConfiguration";
import { getPresetParameterValue } from "./presetSettings";

/**
 * Substitutes ${sourceDir}, ${workspaceFolder}, ${presetName}, ${hostSystemName},
 * ${pathListSep}, ${dollar}, ${env:VARNAME} and ${config:PARAM} in a preset string
 * value.
 * @returns The string with variables substituted, or undefined if input was undefined/null.
 */
export function substituteVariablesInConfigurePreset(
  text: string | undefined,
  workspaceFolder: Uri,
  preset: ConfigurePreset
): string | undefined {
  if (text === undefined || text === null) {
    return undefined;
  }

  let result = text;

  const regexp = /\$\{(.*?)\}/g; // Find ${anything}
  result = result.replace(regexp, (match: string, name: string) => {
    if (match.indexOf("config:") > 0) {
      const configVar = name.substring(
        name.indexOf("config:") + "config:".length
      );

      const delimiterIndex = configVar.indexOf(",");
      let configVarName = configVar;
      let prefix = "";

      // Check if a delimiter (e.g., ",") is present
      if (delimiterIndex > -1) {
        configVarName = configVar.substring(0, delimiterIndex);
        prefix = configVar.substring(delimiterIndex + 1).trim();
      }

      const configVarValue = getPresetParameterValue(configVarName, preset);

      if (!configVarValue) {
        return match;
      }

      if (prefix && Array.isArray(configVarValue)) {
        return configVarValue.map((value) => `${prefix}${value}`).join(" ");
      }

      if (prefix && typeof configVarValue === "string") {
        return `${prefix} ${configVarValue}`;
      }

      return configVarValue;
    }
    if (match.indexOf("env:") > 0) {
      const envVarName = name.substring(name.indexOf("env:") + "env:".length);
      if (preset.environment && preset.environment[envVarName]) {
        return preset.environment[envVarName];
      }
      if (process.env[envVarName]) {
        return process.env[envVarName];
      }
      return match;
    }
    // ${sourceDir} is the CMake preset macro for the project root; the two
    // VS Code spellings are accepted for presets written by hand or by older
    // versions of the extension.
    if (
      match.indexOf("sourceDir") > 0 ||
      match.indexOf("workspaceRoot") > 0 ||
      match.indexOf("workspaceFolder") > 0
    ) {
      return workspaceFolder.fsPath;
    }
    if (match.indexOf("presetName") > 0) {
      return preset.name;
    }
    if (match.indexOf("hostSystemName") > 0) {
      return hostSystemName();
    }
    if (match.indexOf("pathListSep") > 0) {
      return delimiter;
    }
    if (match.indexOf("dollar") > 0) {
      return "$";
    }
    return match;
  });

  return resolveVariables(result, workspaceFolder);
}

/**
 * CMake expands ${hostSystemName} to CMAKE_HOST_SYSTEM_NAME, which is `uname -s`
 * and spells the platforms differently from Node.
 */
function hostSystemName(): string {
  switch (platform()) {
    case "win32":
      return "Windows";
    case "darwin":
      return "Darwin";
    case "linux":
      return "Linux";
    default:
      return platform();
  }
}

/**
 * Rewrites VS Code path macros to their CMake preset equivalent before a value is
 * written to CMakePresets.json. CMake only expands ${sourceDir}, ${presetName},
 * $env{} and $penv{}, and fails the whole file with "Invalid macro expansion"
 * when it meets anything else in a field it parses itself.
 */
export function toCMakePresetMacros<T extends string | string[] | undefined>(
  value: T
): T {
  if (Array.isArray(value)) {
    return value.map((item) => toCMakePresetMacros(item)) as T;
  }
  if (typeof value !== "string") {
    return value;
  }
  return value.replace(
    /\$\{(?:workspaceFolder|workspaceRoot)\}/g,
    "${sourceDir}"
  ) as T;
}
