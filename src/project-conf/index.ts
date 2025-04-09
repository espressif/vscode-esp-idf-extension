/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 15th February 2023 8:19:37 pm
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
import { ExtensionContext, Uri, window } from "vscode";
import { ESP } from "../config";
import { pathExists, readJson, writeJson } from "fs-extra";
import { ProjectConfElement } from "./projectConfiguration";
import * as process from "process";
import { Logger } from "../logger/logger";
export class ProjectConfigStore {
  private static self: ProjectConfigStore;
  private ctx: ExtensionContext;

  public static init(context: ExtensionContext): ProjectConfigStore {
    if (!this.self) {
      return new ProjectConfigStore(context);
    }
    return this.self;
  }
  private constructor(context: ExtensionContext) {
    this.ctx = context;
  }
  public get<T>(key: string, defaultValue?: T): T {
    return this.ctx.workspaceState.get<T>(key, defaultValue);
  }
  public set(key: string, value: any) {
    this.ctx.workspaceState.update(key, value);
  }
  public clear(key: string) {
    return this.set(key, undefined);
  }
}

export async function saveProjectConfFile(
  workspaceFolder: Uri,
  projectConfElements: { [key: string]: ProjectConfElement }
) {
  const projectConfFilePath = Uri.joinPath(
    workspaceFolder,
    ESP.ProjectConfiguration.PROJECT_CONFIGURATION_FILENAME
  );
  await writeJson(projectConfFilePath.fsPath, projectConfElements, {
    spaces: 2,
  });
}

/**
 * Substitutes variables like ${workspaceFolder} and ${env:VARNAME} in a string.
 * @param text The input string potentially containing variables.
 * @param workspaceFolder The workspace folder Uri to resolve ${workspaceFolder}.
 * @returns The string with variables substituted, or undefined if input was undefined/null.
 */
function substituteVariablesInString(
  text: string | undefined,
  workspaceFolder: Uri
): string | undefined {
  if (text === undefined || text === null) {
    return undefined;
  }

  let result = text;
  const workspacePath = workspaceFolder.fsPath;

  // Substitute ${workspaceFolder} and ${workspaceRoot} (common alias)
  result = result.replace(/\$\{workspaceFolder\}/g, workspacePath);
  result = result.replace(/\$\{workspaceRoot\}/g, workspacePath);

  // Substitute ${env:VARNAME}
  result = result.replace(/\$\{env:(\w+)\}/g, (match, envVarName) => {
    return process.env[envVarName] || ""; // Fallback to empty string if env var not set
  });

  return result;
}

/**
 * Resolves configuration paths after substituting variables. Designed for fields
 * that MUST represent filesystem paths.
 * Handles both single path string or array of paths.
 * Ensures the final path is absolute and normalized for the OS.
 * Recommends using '/' as separator in the JSON config for portability.
 * @param workspaceFolder The workspace folder Uri.
 * @param paths The path string or array of path strings from the config.
 * @returns The resolved absolute path(s) or undefined.
 */
function resolveConfigPaths(
  workspaceFolder: Uri,
  paths?: string | string[]
): string | string[] | undefined {
  if (paths === undefined || paths === null) {
    return undefined;
  }

  const resolveSinglePath = (configPath: string): string | undefined => {
    const substitutedPath = substituteVariablesInString(
      configPath,
      workspaceFolder
    );

    if (!substitutedPath) {
      return undefined;
    }

    return path.resolve(workspaceFolder.fsPath, substitutedPath);
  };

  if (Array.isArray(paths)) {
    const resolvedArray = paths.map(resolveSinglePath).filter(isDefined);
    return resolvedArray.length > 0 ? resolvedArray : undefined;
  } else if (typeof paths === "string") {
    return resolveSinglePath(paths);
  } else {
    Logger.warn(
      `Expected string or array for path, received ${typeof paths}`,
      new Error("Invalid path type")
    );
    return undefined;
  }
}

// --- Main Function ---

/**
 * Reads the project configuration JSON file, performs variable substitution
 * on relevant fields, resolves paths, and returns the structured configuration.
 * @param workspaceFolder The Uri of the current workspace folder.
 * @returns An object mapping configuration names to their processed ProjectConfElement.
 */
export async function getProjectConfigurationElements(
  workspaceFolder: Uri
): Promise<{ [key: string]: ProjectConfElement }> {
  const projectConfFilePath = Uri.joinPath(
    workspaceFolder,
    ESP.ProjectConfiguration.PROJECT_CONFIGURATION_FILENAME
  );

  const doesPathExists = await pathExists(projectConfFilePath.fsPath);
  if (!doesPathExists) {
    // File not existing is normal, return empty object
    return {};
  }

  let projectConfJson;
  try {
    projectConfJson = await readJson(projectConfFilePath.fsPath);
    if (typeof projectConfJson !== "object" || projectConfJson === null) {
      throw new Error("Configuration file content is not a valid JSON object.");
    }
  } catch (error) {
    Logger.errorNotify(
      `Failed to read or parse ${ESP.ProjectConfiguration.PROJECT_CONFIGURATION_FILENAME}`,
      error,
      "getProjectConfigurationElements"
    );
    window.showErrorMessage(
      `Error reading or parsing project configuration file (${projectConfFilePath.fsPath}): ${error.message}`
    );
    return {}; // Return empty if JSON is invalid or unreadable
  }

  const projectConfElements: { [key: string]: ProjectConfElement } = {};

  // Process each configuration defined in the JSON
  await Promise.all(
    Object.keys(projectConfJson).map(async (confName) => {
      const rawConfig = projectConfJson[confName];
      if (typeof rawConfig !== "object" || rawConfig === null) {
        Logger.warn(
          `Configuration entry "${confName}" is not a valid object. Skipping.`,
          new Error("Invalid config entry")
        );
        return; // Skip invalid entries
      }

      const buildConfig = rawConfig.build;
      const openOCDConfig = rawConfig.openOCD;
      const tasksConfig = rawConfig.tasks;
      const envConfig = rawConfig.env;

      // --- Process Build Configuration ---
      const buildDirectoryPath = resolveConfigPaths(
        workspaceFolder,
        buildConfig?.buildDirectoryPath
      ) as string | undefined;
      const sdkconfigDefaults = resolveConfigPaths(
        workspaceFolder,
        buildConfig?.sdkconfigDefaults
      ) as string[] | undefined;
      const sdkconfigFilePath = resolveConfigPaths(
        workspaceFolder,
        buildConfig?.sdkconfigFilePath
      ) as string | undefined;
      const compileArgs = buildConfig?.compileArgs
        ?.map((arg: string) =>
          substituteVariablesInString(arg, workspaceFolder)
        )
        .filter(isDefined);
      const ninjaArgs = buildConfig?.ninjaArgs
        ?.map((arg: string) =>
          substituteVariablesInString(arg, workspaceFolder)
        )
        .filter(isDefined);

      // --- Process Environment Variables ---
      let processedEnv: { [key: string]: string } | undefined;
      if (typeof envConfig === "object" && envConfig !== null) {
        processedEnv = {};
        for (const key in envConfig) {
          if (Object.prototype.hasOwnProperty.call(envConfig, key)) {
            const rawValue = envConfig[key];
            if (typeof rawValue === "string") {
              // Substitute variables in the environment variable *value*
              processedEnv[key] =
                substituteVariablesInString(rawValue, workspaceFolder) ?? "";
            } else {
              processedEnv[key] = String(rawValue);
            }
          }
        }
      }

      // --- Process OpenOCD Configuration ---
      const openOCDConfigs = resolveConfigPaths(
        workspaceFolder,
        openOCDConfig?.configs
      ) as string[] | undefined;
      const openOCDArgs = openOCDConfig?.args
        ?.map((arg: string) =>
          substituteVariablesInString(arg, workspaceFolder)
        )
        .filter(isDefined);

      // --- Process Tasks ---
      const preBuild = substituteVariablesInString(
        tasksConfig?.preBuild,
        workspaceFolder
      );
      const preFlash = substituteVariablesInString(
        tasksConfig?.preFlash,
        workspaceFolder
      );
      const postBuild = substituteVariablesInString(
        tasksConfig?.postBuild,
        workspaceFolder
      );
      const postFlash = substituteVariablesInString(
        tasksConfig?.postFlash,
        workspaceFolder
      );

      // --- Assemble the Processed Configuration ---
      projectConfElements[confName] = {
        build: {
          compileArgs: compileArgs ?? [],
          ninjaArgs: ninjaArgs ?? [],
          buildDirectoryPath: buildDirectoryPath,
          sdkconfigDefaults: sdkconfigDefaults,
          sdkconfigFilePath: sdkconfigFilePath,
        },
        env: processedEnv ?? {},
        flashBaudRate: rawConfig.flashBaudRate,
        monitorBaudRate: rawConfig.monitorBaudRate,
        openOCD: {
          debugLevel: openOCDConfig?.debugLevel,
          configs: openOCDConfigs,
          args: openOCDArgs ?? [],
        },
        tasks: {
          preBuild: preBuild,
          preFlash: preFlash,
          postBuild: postBuild,
          postFlash: postFlash,
        },
      };
    })
  );

  return projectConfElements;
}

/**
 * Type guard to filter out undefined values from arrays.
 */
function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
