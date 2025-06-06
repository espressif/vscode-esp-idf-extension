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
import { Logger } from "../logger/logger";
import { resolveVariables } from "../idfConfiguration";

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

export async function updateCurrentProfileIdfTarget(
  idfTarget: string,
  workspaceFolder: Uri
) {
  const selectedConfig = ESP.ProjectConfiguration.store.get<string>(
    ESP.ProjectConfiguration.SELECTED_CONFIG
  );

  if (!selectedConfig) {
    return;
  }

  const projectConfJson = await getProjectConfigurationElements(
    workspaceFolder,
    false
  );

  if (!projectConfJson[selectedConfig]) {
    const err = new Error(
      `Configuration "${selectedConfig}" not found in ${ESP.ProjectConfiguration.PROJECT_CONFIGURATION_FILENAME}.`
    );
    Logger.errorNotify(
      err.message,
      err,
      "updateCurrentProfileIdfTarget project-conf"
    );
    return;
  }
  projectConfJson[selectedConfig].idfTarget = idfTarget;

  ESP.ProjectConfiguration.store.set(
    selectedConfig,
    projectConfJson[selectedConfig]
  );
  await saveProjectConfFile(workspaceFolder, projectConfJson);
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

function parameterToSameProjectConfigMap(
  param: string,
  currentProjectConf: ProjectConfElement
): any {
  switch (param) {
    case "idf.cmakeCompilerArgs":
      return currentProjectConf.build &&
        currentProjectConf.build.compileArgs &&
        currentProjectConf.build.compileArgs.length
        ? currentProjectConf.build.compileArgs
        : "";
    case "idf.ninjaArgs":
      return currentProjectConf.build &&
        currentProjectConf.build.ninjaArgs &&
        currentProjectConf.build.ninjaArgs.length
        ? currentProjectConf.build.ninjaArgs
        : "";
    case "idf.buildPath":
      return currentProjectConf.build &&
        currentProjectConf.build.buildDirectoryPath
        ? currentProjectConf.build.buildDirectoryPath
        : "";
    case "idf.sdkconfigDefaults":
      return currentProjectConf.build &&
        currentProjectConf.build.sdkconfigDefaults &&
        currentProjectConf.build.sdkconfigDefaults.length
        ? currentProjectConf.build.sdkconfigDefaults
        : "";
    case "idf.flashBaudRate":
      return currentProjectConf.flashBaudRate;
    case "idf.monitorBaudRate":
      return currentProjectConf.monitorBaudRate;
    case "idf.openOcdDebugLevel":
      return currentProjectConf.openOCD &&
        currentProjectConf.openOCD.debugLevel &&
        currentProjectConf.openOCD.debugLevel > -1
        ? currentProjectConf.openOCD.debugLevel.toString()
        : "";
    case "idf.openOcdConfigs":
      return currentProjectConf.openOCD &&
        currentProjectConf.openOCD.configs &&
        currentProjectConf.openOCD.configs.length
        ? currentProjectConf.openOCD.configs
        : "";
    case "idf.openOcdLaunchArgs":
      return currentProjectConf.openOCD &&
        currentProjectConf.openOCD.args &&
        currentProjectConf.openOCD.args.length
        ? currentProjectConf.openOCD.args
        : "";
    case "idf.preBuildTask":
      return currentProjectConf.tasks && currentProjectConf.tasks.preBuild
        ? currentProjectConf.tasks.preBuild
        : "";
    case "idf.postBuildTask":
      return currentProjectConf.tasks && currentProjectConf.tasks.postBuild
        ? currentProjectConf.tasks.postBuild
        : "";
    case "idf.preFlashTask":
      return currentProjectConf.tasks && currentProjectConf.tasks.preFlash
        ? currentProjectConf.tasks.preFlash
        : "";
    case "idf.postFlashTask":
      return currentProjectConf.tasks && currentProjectConf.tasks.postFlash
        ? currentProjectConf.tasks.postFlash
        : "";
    case "idf.sdkconfigFilePath":
      return currentProjectConf.build &&
        currentProjectConf.build.sdkconfigFilePath
        ? currentProjectConf.build.sdkconfigFilePath
        : "";
    default:
      return "";
  }
}

/**
 * Substitutes variables like ${workspaceFolder} and ${env:VARNAME} in a string.
 * @param text The input string potentially containing variables.
 * @param workspaceFolder The workspace folder Uri to resolve ${workspaceFolder}.
 * @returns The string with variables substituted, or undefined if input was undefined/null.
 */
function substituteVariablesInString(
  text: string | undefined,
  workspaceFolder: Uri,
  config: any
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
      const configVarValue = parameterToSameProjectConfigMap(configVarName, config);

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
      if (config.env && config.env[envVarName]) {
        return config.env[envVarName];
      }
      if (process.env[envVarName]) {
        return process.env[envVarName];
      }
      return match;
    }
    if (match.indexOf("workspaceRoot") > 0) {
      return workspaceFolder.fsPath;
    }
    if (match.indexOf("workspaceFolder") > 0) {
      return workspaceFolder.fsPath;
    }
    return match;
  });

  // Substitute ${config:VARNAME}
  result = resolveVariables(result, workspaceFolder);

  return result;
}

/**
 * Resolves configuration paths after substituting variables. Designed for fields
 * that MUST represent filesystem paths.
 * Handles both single path string or array of paths.
 * When resolvePaths is true, relative paths are resolved relative to workspaceFolder.
 * When resolvePaths is false, paths are returned as-is.
 * @param workspaceFolder The workspace folder Uri.
 * @param paths The path string or array of path strings from the config.
 * @param resolvePaths Whether to resolve paths to absolute paths
 * @returns The path(s) with variables substituted or undefined.
 */
function resolveConfigPaths(
  workspaceFolder: Uri,
  config: any,
  paths?: string | string[],
  resolvePaths: boolean = false
): string | string[] | undefined {
  if (paths === undefined || paths === null) {
    return undefined;
  }

  const resolveSinglePath = (configPath: string): string | undefined => {
    // First substitute any variables
    const substitutedPath = substituteVariablesInString(
      configPath,
      workspaceFolder,
      config
    );
    if (!substitutedPath) {
      return undefined;
    }

    if (!resolvePaths) {
      // Return the path as is for display
      return substitutedPath;
    }

    // For building, ensure relative paths are resolved relative to workspaceFolder
    if (path.isAbsolute(substitutedPath)) {
      return substitutedPath;
    }

    // Join with workspace folder to get absolute path
    return path.join(workspaceFolder.fsPath, substitutedPath);
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
 * @param resolvePaths Whether to resolve paths to absolute paths (true for building, false for display)
 * @returns An object mapping configuration names to their processed ProjectConfElement.
 */
export async function getProjectConfigurationElements(
  workspaceFolder: Uri,
  resolvePaths: boolean = false
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
      const buildDirectoryPath = resolvePaths
        ? resolveConfigPaths(
            workspaceFolder,
            rawConfig,
            buildConfig?.buildDirectoryPath,
            resolvePaths
          )
        : buildConfig?.buildDirectoryPath;
      const sdkconfigDefaults = resolvePaths
        ? resolveConfigPaths(
            workspaceFolder,
            rawConfig,
            buildConfig?.sdkconfigDefaults,
            resolvePaths
          )
        : buildConfig?.sdkconfigDefaults;
      const sdkconfigFilePath = resolvePaths
        ? resolveConfigPaths(
            workspaceFolder,
            rawConfig,
            buildConfig?.sdkconfigFilePath,
            resolvePaths
          )
        : buildConfig?.sdkconfigFilePath;
      const compileArgs = buildConfig?.compileArgs
        ?.map((arg: string) =>
          resolvePaths
            ? substituteVariablesInString(arg, workspaceFolder, rawConfig)
            : arg
        )
        .filter(isDefined);
      const ninjaArgs = buildConfig?.ninjaArgs
        ?.map((arg: string) =>
          resolvePaths
            ? substituteVariablesInString(arg, workspaceFolder, rawConfig)
            : arg
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
              processedEnv[key] = resolvePaths
                ? substituteVariablesInString(
                    rawValue,
                    workspaceFolder,
                    rawConfig
                  ) ?? ""
                : rawValue;
            } else {
              processedEnv[key] = String(rawValue);
            }
          }
        }
      }

      // --- Process OpenOCD Configuration ---
      const openOCDConfigs = openOCDConfig?.configs;
      const openOCDArgs = openOCDConfig?.args
        ?.map((arg: string) =>
          resolvePaths
            ? substituteVariablesInString(arg, workspaceFolder, rawConfig)
            : arg
        )
        .filter(isDefined);

      // --- Process Tasks ---
      const preBuild = resolvePaths
        ? substituteVariablesInString(
            tasksConfig?.preBuild,
            workspaceFolder,
            rawConfig
          )
        : tasksConfig?.preBuild;
      const preFlash = resolvePaths
        ? substituteVariablesInString(
            tasksConfig?.preFlash,
            workspaceFolder,
            rawConfig
          )
        : tasksConfig?.preFlash;
      const postBuild = resolvePaths
        ? substituteVariablesInString(
            tasksConfig?.postBuild,
            workspaceFolder,
            rawConfig
          )
        : tasksConfig?.postBuild;
      const postFlash = resolvePaths
        ? substituteVariablesInString(
            tasksConfig?.postFlash,
            workspaceFolder,
            rawConfig
          )
        : tasksConfig?.postFlash;

      // --- Assemble the Processed Configuration ---
      projectConfElements[confName] = {
        build: {
          compileArgs: compileArgs ?? [],
          ninjaArgs: ninjaArgs ?? [],
          buildDirectoryPath: buildDirectoryPath,
          sdkconfigDefaults: sdkconfigDefaults ?? [],
          sdkconfigFilePath: sdkconfigFilePath,
        },
        env: processedEnv ?? {},
        idfTarget: rawConfig.idfTarget,
        flashBaudRate: rawConfig.flashBaudRate,
        monitorBaudRate: rawConfig.monitorBaudRate,
        openOCD: {
          debugLevel: openOCDConfig?.debugLevel,
          configs: openOCDConfigs ?? [],
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
