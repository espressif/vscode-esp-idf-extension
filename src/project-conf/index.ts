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
import { ExtensionContext, Uri, window, l10n } from "vscode";
import { ESP } from "../config";
import { pathExists, readJson, writeJson } from "fs-extra";
import {
  ProjectConfElement,
  CMakePresets,
  ConfigurePreset,
  BuildPreset,
  ESPIDFSettings,
  ESPIDFVendorSettings,
} from "./projectConfiguration";
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
  await updateCurrentProjectConfiguration(workspaceFolder, (config) => {
    // Update IDF_TARGET in cacheVariables for ConfigurePreset
    if (!config.cacheVariables) {
      config.cacheVariables = {};
    }
    config.cacheVariables.IDF_TARGET = idfTarget;
    return config;
  });
}

/**
 * Updates OpenOCD configuration for the currently selected project configuration
 */
export async function updateCurrentProfileOpenOcdConfigs(
  configs: string[],
  workspaceFolder: Uri
) {
  await updateCurrentProjectConfiguration(workspaceFolder, (config) => {
    // Update OpenOCD configs in vendor settings
    if (!config.vendor) {
      config.vendor = { "espressif/vscode-esp-idf": { settings: [] } };
    }
    if (!config.vendor["espressif/vscode-esp-idf"]) {
      config.vendor["espressif/vscode-esp-idf"] = { settings: [] };
    }

    // Remove existing openOCD setting
    config.vendor["espressif/vscode-esp-idf"].settings = 
      config.vendor["espressif/vscode-esp-idf"].settings.filter(
        (setting) => setting.type !== "openOCD"
      );

    // Add new openOCD setting
    config.vendor["espressif/vscode-esp-idf"].settings.push({
      type: "openOCD",
      value: {
        debugLevel: 2,
        configs: configs,
        args: []
      }
    });

    return config;
  });
}

/**
 * Updates custom extra variables for the currently selected project configuration
 * Note: IDF_TARGET is excluded as it should be in cacheVariables, not environment
 */
export async function updateCurrentProfileCustomExtraVars(
  customVars: { [key: string]: string },
  workspaceFolder: Uri
) {
  await updateCurrentProjectConfiguration(workspaceFolder, (config) => {
    // Update custom extra variables in environment
    if (!config.environment) {
      config.environment = {};
    }
    
    // Filter out IDF_TARGET as it should be in cacheVariables, not environment
    const filteredVars = { ...customVars };
    delete filteredVars.IDF_TARGET;
    
    // Merge the custom variables into the environment (excluding IDF_TARGET)
    Object.assign(config.environment, filteredVars);
    
    return config;
  });
}


/**
 * Generic function to update any configuration setting for the currently selected project configuration
 */
export async function updateCurrentProjectConfiguration(
  workspaceFolder: Uri,
  updateFunction: (config: ConfigurePreset) => ConfigurePreset
): Promise<void> {
  const selectedConfig = ESP.ProjectConfiguration.store.get<string>(
    ESP.ProjectConfiguration.SELECTED_CONFIG
  );

  if (!selectedConfig) {
    // No configuration selected - don't update any files
    return;
  }

  const projectConfJson = await getProjectConfigurationElements(
    workspaceFolder,
    false
  );

  if (!projectConfJson[selectedConfig]) {
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

  // Apply the update function to the configuration
  const updatedConfig = updateFunction(projectConfJson[selectedConfig]);

  // Save to the correct file based on where the configuration originated
  await saveProjectConfigurationToCorrectFile(
    workspaceFolder,
    selectedConfig,
    updatedConfig
  );

  // Keep in-memory store consistent with consumers expecting legacy ProjectConfElement
  // Re-read processed presets (with resolved paths) and convert to legacy shape
  try {
    const resolvedConfigs = await getProjectConfigurationElements(
      workspaceFolder,
      true
    );
    const resolvedPreset = resolvedConfigs[selectedConfig] || updatedConfig;
    const legacyElement = configurePresetToProjectConfElement(resolvedPreset);
    ESP.ProjectConfiguration.store.set(selectedConfig, legacyElement);
  } catch (e) {
    // Fallback: ensure we at least keep the updated preset in store
    ESP.ProjectConfiguration.store.set(selectedConfig, updatedConfig);
  }
}

/**
 * Saves a single configuration to the correct file based on its source
 */
export async function saveProjectConfigurationToCorrectFile(
  workspaceFolder: Uri,
  configName: string,
  configPreset: ConfigurePreset
) {
  // Determine which file the configuration should be saved to
  const configSource = await determineConfigurationSource(workspaceFolder, configName);
  
  if (configSource === 'user') {
    await saveConfigurationToUserPresets(workspaceFolder, configName, configPreset);
  } else if (configSource === 'project') {
    await saveConfigurationToProjectPresets(workspaceFolder, configName, configPreset);
  } else {
    // If source is unknown and we have a selected config, default to user presets
    // This handles the case where a user modifies a configuration that doesn't exist yet
    await saveConfigurationToUserPresets(workspaceFolder, configName, configPreset);
  }
}

/**
 * Determines the source file for a configuration (project vs user presets)
 */
async function determineConfigurationSource(
  workspaceFolder: Uri,
  configName: string
): Promise<'project' | 'user' | 'unknown'> {
  const cmakePresetsFilePath = Uri.joinPath(
    workspaceFolder,
    ESP.ProjectConfiguration.PROJECT_CONFIGURATION_FILENAME
  );
  const cmakeUserPresetsFilePath = Uri.joinPath(
    workspaceFolder,
    ESP.ProjectConfiguration.USER_CONFIGURATION_FILENAME
  );

  // Check if config exists in CMakeUserPresets.json first (user presets take precedence)
  if (await pathExists(cmakeUserPresetsFilePath.fsPath)) {
    try {
      const userPresetsJson = await readJson(cmakeUserPresetsFilePath.fsPath);
      if (userPresetsJson?.configurePresets?.some((preset: any) => preset.name === configName)) {
        return 'user';
      }
    } catch (error) {
      Logger.error(`Error reading user presets file: ${error.message}`, error, "determineConfigurationSource");
    }
  }

  // Check if config exists in CMakePresets.json
  if (await pathExists(cmakePresetsFilePath.fsPath)) {
    try {
      const projectPresetsJson = await readJson(cmakePresetsFilePath.fsPath);
      if (projectPresetsJson?.configurePresets?.some((preset: any) => preset.name === configName)) {
        return 'project';
      }
    } catch (error) {
      Logger.error(`Error reading project presets file: ${error.message}`, error, "determineConfigurationSource");
    }
  }

  return 'unknown';
}

/**
 * Saves a configuration to CMakeUserPresets.json
 */
async function saveConfigurationToUserPresets(
  workspaceFolder: Uri,
  configName: string,
  configPreset: ConfigurePreset
) {
  const cmakeUserPresetsFilePath = Uri.joinPath(
    workspaceFolder,
    ESP.ProjectConfiguration.USER_CONFIGURATION_FILENAME
  );

  let userPresets: CMakePresets;
  
  // Read existing user presets or create new structure
  if (await pathExists(cmakeUserPresetsFilePath.fsPath)) {
    try {
      userPresets = await readJson(cmakeUserPresetsFilePath.fsPath);
    } catch (error) {
      Logger.error(`Error reading user presets file: ${error.message}`, error, "saveConfigurationToUserPresets");
      userPresets = {
        version: 3,
        configurePresets: []
      };
    }
  } else {
    userPresets = {
      version: 3,
      configurePresets: []
    };
  }

  // Ensure configurePresets array exists
  if (!userPresets.configurePresets) {
    userPresets.configurePresets = [];
  }

  // Update or add the configuration
  const existingIndex = userPresets.configurePresets.findIndex(
    (preset: ConfigurePreset) => preset.name === configName
  );

  if (existingIndex >= 0) {
    userPresets.configurePresets[existingIndex] = configPreset;
  } else {
    userPresets.configurePresets.push(configPreset);
  }

  await writeJson(cmakeUserPresetsFilePath.fsPath, userPresets, {
    spaces: 2,
  });
}

/**
 * Saves a configuration to CMakePresets.json
 */
async function saveConfigurationToProjectPresets(
  workspaceFolder: Uri,
  configName: string,
  configPreset: ConfigurePreset
) {
  const cmakePresetsFilePath = Uri.joinPath(
    workspaceFolder,
    ESP.ProjectConfiguration.PROJECT_CONFIGURATION_FILENAME
  );

  let projectPresets: CMakePresets;
  
  // Read existing project presets or create new structure
  if (await pathExists(cmakePresetsFilePath.fsPath)) {
    try {
      projectPresets = await readJson(cmakePresetsFilePath.fsPath);
    } catch (error) {
      Logger.error(`Error reading project presets file: ${error.message}`, error, "saveConfigurationToProjectPresets");
      projectPresets = {
        version: 3,
        configurePresets: []
      };
    }
  } else {
    projectPresets = {
      version: 3,
      configurePresets: []
    };
  }

  // Ensure configurePresets array exists
  if (!projectPresets.configurePresets) {
    projectPresets.configurePresets = [];
  }

  // Update or add the configuration
  const existingIndex = projectPresets.configurePresets.findIndex(
    (preset: ConfigurePreset) => preset.name === configName
  );

  if (existingIndex >= 0) {
    projectPresets.configurePresets[existingIndex] = configPreset;
  } else {
    projectPresets.configurePresets.push(configPreset);
  }

  await writeJson(cmakePresetsFilePath.fsPath, projectPresets, {
    spaces: 2,
  });
}

export async function saveProjectConfFile(
  workspaceFolder: Uri,
  projectConfElements: { [key: string]: ConfigurePreset }
) {
  const projectConfFilePath = Uri.joinPath(
    workspaceFolder,
    ESP.ProjectConfiguration.PROJECT_CONFIGURATION_FILENAME
  );

  // Use ConfigurePreset objects directly
  const configurePresets: ConfigurePreset[] = Object.values(
    projectConfElements
  );

  const cmakePresets: CMakePresets = {
    version: 3,
    cmakeMinimumRequired: { major: 3, minor: 23, patch: 0 },
    configurePresets,
  };

  await writeJson(projectConfFilePath.fsPath, cmakePresets, {
    spaces: 2,
  });
}

// Legacy compatibility function
export async function saveProjectConfFileLegacy(
  workspaceFolder: Uri,
  projectConfElements: { [key: string]: ProjectConfElement }
) {
  const projectConfFilePath = Uri.joinPath(
    workspaceFolder,
    ESP.ProjectConfiguration.PROJECT_CONFIGURATION_FILENAME
  );

  // Convert to CMakePresets format
  const configurePresets: ConfigurePreset[] = Object.keys(
    projectConfElements
  ).map((name) =>
    convertProjectConfElementToConfigurePreset(name, projectConfElements[name])
  );

  const cmakePresets: CMakePresets = {
    version: 1,
    cmakeMinimumRequired: { major: 3, minor: 23, patch: 0 },
    configurePresets,
  };

  await writeJson(projectConfFilePath.fsPath, cmakePresets, {
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
      const configVarValue = parameterToSameProjectConfigMap(
        configVarName,
        config
      );

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
 * Reads both CMakePresets.json and CMakeUserPresets.json files, performs variable substitution
 * on relevant fields, resolves paths, and returns the merged structured configuration.
 * @param workspaceFolder The Uri of the current workspace folder.
 * @param resolvePaths Whether to resolve paths to absolute paths (true for building, false for display)
 * @returns An object mapping configuration names to their processed ConfigurePreset.
 */
export async function getProjectConfigurationElements(
  workspaceFolder: Uri,
  resolvePaths: boolean = false
): Promise<{ [key: string]: ConfigurePreset }> {
  const allRawPresets: { [key: string]: ConfigurePreset } = {};

  // Read CMakePresets.json
  const cmakePresetsFilePath = Uri.joinPath(
    workspaceFolder,
    ESP.ProjectConfiguration.PROJECT_CONFIGURATION_FILENAME
  );

  // Read CMakeUserPresets.json
  const cmakeUserPresetsFilePath = Uri.joinPath(
    workspaceFolder,
    ESP.ProjectConfiguration.USER_CONFIGURATION_FILENAME
  );

  const cmakePresetsExists = await pathExists(cmakePresetsFilePath.fsPath);
  const cmakeUserPresetsExists = await pathExists(
    cmakeUserPresetsFilePath.fsPath
  );

  // If neither file exists, check for legacy file
  if (!cmakePresetsExists && !cmakeUserPresetsExists) {
    await checkAndPromptLegacyMigration(workspaceFolder);
    return {};
  }

  // First pass: Load all raw presets from both files without processing inheritance
  if (cmakePresetsExists) {
    try {
      const cmakePresetsJson = await readJson(cmakePresetsFilePath.fsPath);
      if (typeof cmakePresetsJson === "object" && cmakePresetsJson !== null) {
        const presets = await loadRawConfigurationFile(
          cmakePresetsJson,
          "CMakePresets.json"
        );
        Object.assign(allRawPresets, presets);
      }
    } catch (error) {
      Logger.errorNotify(
        `Failed to read or parse ${ESP.ProjectConfiguration.PROJECT_CONFIGURATION_FILENAME}`,
        error,
        "getProjectConfigurationElements"
      );
      window.showErrorMessage(
        `Error reading or parsing CMakePresets.json file (${cmakePresetsFilePath.fsPath}): ${error.message}`
      );
    }
  }

  if (cmakeUserPresetsExists) {
    try {
      const cmakeUserPresetsJson = await readJson(
        cmakeUserPresetsFilePath.fsPath
      );
      if (
        typeof cmakeUserPresetsJson === "object" &&
        cmakeUserPresetsJson !== null
      ) {
        const presets = await loadRawConfigurationFile(
          cmakeUserPresetsJson,
          "CMakeUserPresets.json"
        );
        // User presets override project presets with the same name
        Object.assign(allRawPresets, presets);
      }
    } catch (error) {
      Logger.errorNotify(
        `Failed to read or parse ${ESP.ProjectConfiguration.USER_CONFIGURATION_FILENAME}`,
        error,
        "getProjectConfigurationElements"
      );
      window.showErrorMessage(
        `Error reading or parsing CMakeUserPresets.json file (${cmakeUserPresetsFilePath.fsPath}): ${error.message}`
      );
    }
  }

  // Second pass: Resolve inheritance and process variables
  const processedPresets: { [key: string]: ConfigurePreset } = {};
  for (const [name, preset] of Object.entries(allRawPresets)) {
    try {
      const resolvedPreset = await resolvePresetInheritance(
        preset,
        allRawPresets
      );
      const processedPreset = await processConfigurePresetVariables(
        resolvedPreset,
        workspaceFolder,
        resolvePaths
      );
      processedPresets[name] = processedPreset;
    } catch (error) {
      Logger.warn(
        `Failed to process configure preset "${name}": ${error.message}`,
        error
      );
    }
  }

  return processedPresets;
}

/**
 * Loads raw presets from a configuration file without processing inheritance or variables
 * @param configJson The parsed JSON content of the configuration file
 * @param fileName The name of the file being processed (for error messages)
 * @returns An object mapping configuration names to their raw ConfigurePreset
 */
async function loadRawConfigurationFile(
  configJson: any,
  fileName: string
): Promise<{ [key: string]: ConfigurePreset }> {
  const rawPresets: { [key: string]: ConfigurePreset } = {};

  // Only support CMakePresets format
  if (configJson.version !== undefined && configJson.configurePresets) {
    const cmakePresets = configJson as CMakePresets;

    if (
      !cmakePresets.configurePresets ||
      cmakePresets.configurePresets.length === 0
    ) {
      return {};
    }

    // Load each configure preset without processing
    for (const preset of cmakePresets.configurePresets) {
      rawPresets[preset.name] = { ...preset };
    }
  } else {
    // This might be a legacy file that wasn't migrated
    Logger.warn(
      `Invalid ${fileName} format detected. Expected 'version' and 'configurePresets' fields.`,
      new Error("Invalid CMakePresets format")
    );
    window.showErrorMessage(
      `Invalid ${fileName} format. Please ensure the file follows the CMakePresets specification.`
    );
  }

  return rawPresets;
}

/**
 * Resolves inheritance for a preset by merging it with its parent presets
 * @param preset The preset to resolve inheritance for
 * @param allPresets All available presets (for inheritance lookup)
 * @returns The preset with inheritance resolved
 */
async function resolvePresetInheritance(
  preset: ConfigurePreset,
  allPresets: { [key: string]: ConfigurePreset }
): Promise<ConfigurePreset> {
  // If no inheritance, return as-is
  if (!preset.inherits) {
    return { ...preset };
  }

  // Handle both single string and array of strings for inherits
  const parentNames = Array.isArray(preset.inherits)
    ? preset.inherits
    : [preset.inherits];

  // Start with an empty base preset
  let resolvedPreset: ConfigurePreset = { name: preset.name };

  // Apply each parent preset in order
  for (const parentName of parentNames) {
    const parentPreset = allPresets[parentName];
    if (!parentPreset) {
      Logger.warn(
        `Preset "${preset.name}" inherits from "${parentName}" which was not found`,
        new Error("Missing parent preset")
      );
      continue;
    }

    // Recursively resolve parent's inheritance first
    const resolvedParent = await resolvePresetInheritance(
      parentPreset,
      allPresets
    );

    // Merge parent into resolved preset
    resolvedPreset = mergePresets(resolvedPreset, resolvedParent);
  }

  // Finally, merge the current preset (child overrides parent)
  resolvedPreset = mergePresets(resolvedPreset, preset);

  // Remove the inherits property from the final result
  delete resolvedPreset.inherits;

  return resolvedPreset;
}

/**
 * Merges two presets, with the child preset overriding the parent preset
 * @param parent The parent preset
 * @param child The child preset (takes precedence)
 * @returns The merged preset
 */
function mergePresets(
  parent: ConfigurePreset,
  child: ConfigurePreset
): ConfigurePreset {
  const merged: ConfigurePreset = { ...parent };

  // Merge basic properties
  if (child.name !== undefined) merged.name = child.name;
  if (child.binaryDir !== undefined) merged.binaryDir = child.binaryDir;
  if (child.inherits !== undefined) merged.inherits = child.inherits;

  // Merge cacheVariables (child overrides parent)
  if (child.cacheVariables || parent.cacheVariables) {
    merged.cacheVariables = {
      ...(parent.cacheVariables || {}),
      ...(child.cacheVariables || {}),
    };
  }

  // Merge environment (child overrides parent)
  if (child.environment || parent.environment) {
    merged.environment = {
      ...(parent.environment || {}),
      ...(child.environment || {}),
    };
  }

  // Merge vendor settings (child overrides parent)
  if (child.vendor || parent.vendor) {
    merged.vendor = {
      "espressif/vscode-esp-idf": {
        settings: [
          ...(parent.vendor?.["espressif/vscode-esp-idf"]?.settings || []),
          ...(child.vendor?.["espressif/vscode-esp-idf"]?.settings || []),
        ],
      },
    };
  }

  return merged;
}

/**
 * Processes a single configuration file (CMakePresets.json or CMakeUserPresets.json)
 * @param configJson The parsed JSON content of the configuration file
 * @param workspaceFolder The workspace folder Uri
 * @param resolvePaths Whether to resolve paths to absolute paths
 * @param fileName The name of the file being processed (for error messages)
 * @returns An object mapping configuration names to their processed ConfigurePreset
 * @deprecated Use loadRawConfigurationFile and resolvePresetInheritance instead
 */
async function processConfigurationFile(
  configJson: any,
  workspaceFolder: Uri,
  resolvePaths: boolean,
  fileName: string
): Promise<{ [key: string]: ConfigurePreset }> {
  const projectConfElements: { [key: string]: ConfigurePreset } = {};

  // Only support CMakePresets format
  if (configJson.version !== undefined && configJson.configurePresets) {
    const cmakePresets = configJson as CMakePresets;

    if (
      !cmakePresets.configurePresets ||
      cmakePresets.configurePresets.length === 0
    ) {
      return {};
    }

    // Process each configure preset
    for (const preset of cmakePresets.configurePresets) {
      try {
        // Apply variable substitution and path resolution directly to ConfigurePreset
        const processedPreset = await processConfigurePresetVariables(
          preset,
          workspaceFolder,
          resolvePaths
        );

        projectConfElements[preset.name] = processedPreset;
      } catch (error) {
        Logger.warn(
          `Failed to process configure preset "${preset.name}" from ${fileName}: ${error.message}`,
          error
        );
      }
    }
  } else {
    // This might be a legacy file that wasn't migrated
    Logger.warn(
      `Invalid ${fileName} format detected. Expected 'version' and 'configurePresets' fields.`,
      new Error("Invalid CMakePresets format")
    );
    window.showErrorMessage(
      `Invalid ${fileName} format. Please ensure the file follows the CMakePresets specification.`
    );
  }

  return projectConfElements;
}

/**
 * Checks for legacy project configuration file and prompts user for migration
 */
async function checkAndPromptLegacyMigration(
  workspaceFolder: Uri
): Promise<void> {
  const legacyFilePath = Uri.joinPath(
    workspaceFolder,
    "esp_idf_project_configuration.json"
  );

  if (await pathExists(legacyFilePath.fsPath)) {
    await promptLegacyMigration(workspaceFolder, legacyFilePath);
  }
}

/**
 * Prompts user to migrate legacy configuration file
 */
export async function promptLegacyMigration(
  workspaceFolder: Uri,
  legacyFilePath: Uri
): Promise<void> {
  const message = l10n.t(
    "A legacy project configuration file (esp_idf_project_configuration.json) was found. " +
      "Would you like to migrate it to the new CMakePresets.json format? " +
      "Your original file will remain unchanged."
  );

  const migrateOption = l10n.t("Migrate");
  const cancelOption = l10n.t("Cancel");

  const choice = await window.showInformationMessage(
    message,
    { modal: true },
    migrateOption,
    cancelOption
  );

  if (choice === migrateOption) {
    await migrateLegacyConfiguration(workspaceFolder, legacyFilePath);
  }
}

/**
 * Migrates legacy configuration to CMakePresets format
 */
export async function migrateLegacyConfiguration(
  workspaceFolder: Uri,
  legacyFilePath: Uri
): Promise<void> {
  // Read legacy configuration
  const legacyConfig = await readJson(legacyFilePath.fsPath);

  // Convert to new format
  const projectConfElements: { [key: string]: ProjectConfElement } = {};

  // Process legacy configurations
  for (const [confName, rawConfig] of Object.entries(legacyConfig)) {
    if (typeof rawConfig === "object" && rawConfig !== null) {
      try {
        const processedElement = await processLegacyProjectConfig(
          rawConfig,
          workspaceFolder,
          false // Don't resolve paths for migration
        );
        projectConfElements[confName] = processedElement;
      } catch (error) {
        Logger.warn(
          `Failed to migrate configuration "${confName}": ${error.message}`,
          error
        );
      }
    }
  }

  // Save in new format using legacy compatibility function
  await saveProjectConfFileLegacy(workspaceFolder, projectConfElements);

  Logger.info(
    `Successfully migrated ${
      Object.keys(projectConfElements).length
    } configurations to CMakePresets.json`
  );
}

/**
 * Processes legacy project configuration format
 */
async function processLegacyProjectConfig(
  rawConfig: any,
  workspaceFolder: Uri,
  resolvePaths: boolean
): Promise<ProjectConfElement> {
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
  return {
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
}

/**
 * Processes variable substitution and path resolution for ConfigurePreset
 */
async function processConfigurePresetVariables(
  preset: ConfigurePreset,
  workspaceFolder: Uri,
  resolvePaths: boolean
): Promise<ConfigurePreset> {
  const processedPreset: ConfigurePreset = {
    ...preset,
    binaryDir: preset.binaryDir
      ? await processConfigurePresetPath(
          preset.binaryDir,
          workspaceFolder,
          preset,
          resolvePaths
        )
      : undefined,
    cacheVariables: preset.cacheVariables
      ? await processConfigurePresetCacheVariables(
          preset.cacheVariables,
          workspaceFolder,
          preset,
          resolvePaths
        )
      : undefined,
    environment: preset.environment
      ? await processConfigurePresetEnvironment(
          preset.environment,
          workspaceFolder,
          preset,
          resolvePaths
        )
      : undefined,
    vendor: preset.vendor
      ? await processConfigurePresetVendor(
          preset.vendor,
          workspaceFolder,
          preset,
          resolvePaths
        )
      : undefined,
  };

  return processedPreset;
}

/**
 * Processes paths in ConfigurePreset
 */
async function processConfigurePresetPath(
  pathValue: string,
  workspaceFolder: Uri,
  preset: ConfigurePreset,
  resolvePaths: boolean
): Promise<string> {
  // Apply variable substitution
  let processedPath = substituteVariablesInConfigurePreset(
    pathValue,
    workspaceFolder,
    preset
  );

  if (resolvePaths && processedPath) {
    // Resolve relative paths to absolute paths
    if (!path.isAbsolute(processedPath)) {
      processedPath = path.join(workspaceFolder.fsPath, processedPath);
    }
  }

  return processedPath || pathValue;
}

/**
 * Processes cache variables in ConfigurePreset
 */
async function processConfigurePresetCacheVariables(
  cacheVariables: { [key: string]: any },
  workspaceFolder: Uri,
  preset: ConfigurePreset,
  resolvePaths: boolean
): Promise<{ [key: string]: any }> {
  const processedCacheVariables: { [key: string]: any } = {};

  for (const [key, value] of Object.entries(cacheVariables)) {
    if (typeof value === "string") {
      processedCacheVariables[key] = substituteVariablesInConfigurePreset(
        value,
        workspaceFolder,
        preset
      );

      // Special handling for path-related cache variables
      if (resolvePaths && (key === "SDKCONFIG" || key.includes("PATH"))) {
        const processedValue = processedCacheVariables[key];
        if (processedValue && !path.isAbsolute(processedValue)) {
          processedCacheVariables[key] = path.join(
            workspaceFolder.fsPath,
            processedValue
          );
        }
      }
    } else {
      processedCacheVariables[key] = value;
    }
  }

  return processedCacheVariables;
}

/**
 * Processes environment variables in ConfigurePreset
 */
async function processConfigurePresetEnvironment(
  environment: { [key: string]: string },
  workspaceFolder: Uri,
  preset: ConfigurePreset,
  resolvePaths: boolean
): Promise<{ [key: string]: string }> {
  const processedEnvironment: { [key: string]: string } = {};

  for (const [key, value] of Object.entries(environment)) {
    processedEnvironment[key] =
      substituteVariablesInConfigurePreset(value, workspaceFolder, preset) ||
      value;
  }

  return processedEnvironment;
}

/**
 * Processes vendor-specific settings in ConfigurePreset
 */
async function processConfigurePresetVendor(
  vendor: ESPIDFVendorSettings,
  workspaceFolder: Uri,
  preset: ConfigurePreset,
  resolvePaths: boolean
): Promise<ESPIDFVendorSettings> {
  const processedVendor: ESPIDFVendorSettings = {
    "espressif/vscode-esp-idf": {
      settings: [],
    },
  };

  const espIdfSettings = vendor["espressif/vscode-esp-idf"]?.settings || [];

  for (const setting of espIdfSettings) {
    const processedSetting: ESPIDFSettings = { ...setting };

    // Process string values in settings
    if (typeof setting.value === "string") {
      processedSetting.value =
        substituteVariablesInConfigurePreset(
          setting.value,
          workspaceFolder,
          preset
        ) || setting.value;
    } else if (Array.isArray(setting.value)) {
      // Process arrays of strings
      processedSetting.value = setting.value.map((item) =>
        typeof item === "string"
          ? substituteVariablesInConfigurePreset(
              item,
              workspaceFolder,
              preset
            ) || item
          : item
      );
    } else if (typeof setting.value === "object" && setting.value !== null) {
      // Process objects (like openOCD settings)
      processedSetting.value = await processConfigurePresetSettingObject(
        setting.value,
        workspaceFolder,
        preset,
        resolvePaths
      );
    }

    processedVendor["espressif/vscode-esp-idf"].settings.push(processedSetting);
  }

  return processedVendor;
}

/**
 * Processes object values in vendor settings
 */
async function processConfigurePresetSettingObject(
  obj: any,
  workspaceFolder: Uri,
  preset: ConfigurePreset,
  resolvePaths: boolean
): Promise<any> {
  const processedObj: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      processedObj[key] =
        substituteVariablesInConfigurePreset(value, workspaceFolder, preset) ||
        value;
    } else if (Array.isArray(value)) {
      processedObj[key] = value.map((item) =>
        typeof item === "string"
          ? substituteVariablesInConfigurePreset(
              item,
              workspaceFolder,
              preset
            ) || item
          : item
      );
    } else {
      processedObj[key] = value;
    }
  }

  return processedObj;
}

/**
 * Processes variable substitution and path resolution for ProjectConfElement (legacy compatibility)
 */
async function processProjectConfElementVariables(
  element: ProjectConfElement,
  workspaceFolder: Uri,
  resolvePaths: boolean
): Promise<ProjectConfElement> {
  // Create a temporary raw config object for variable substitution
  const rawConfig = {
    build: element.build,
    env: element.env,
    idfTarget: element.idfTarget,
    flashBaudRate: element.flashBaudRate,
    monitorBaudRate: element.monitorBaudRate,
    openOCD: element.openOCD,
    tasks: element.tasks,
  };

  return processLegacyProjectConfig(rawConfig, workspaceFolder, resolvePaths);
}

/**
 * Substitutes variables like ${workspaceFolder} and ${env:VARNAME} in a string for ConfigurePreset.
 * @param text The input string potentially containing variables.
 * @param workspaceFolder The workspace folder Uri to resolve ${workspaceFolder}.
 * @param preset The ConfigurePreset to resolve ${config:VARNAME} variables.
 * @returns The string with variables substituted, or undefined if input was undefined/null.
 */
function substituteVariablesInConfigurePreset(
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

      const configVarValue = getConfigurePresetParameterValue(
        configVarName,
        preset
      );

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
 * Gets parameter value from ConfigurePreset for variable substitution
 */
function getConfigurePresetParameterValue(
  param: string,
  preset: ConfigurePreset
): any {
  switch (param) {
    case "idf.cmakeCompilerArgs":
      return getESPIDFSettingValue(preset, "compileArgs") || "";
    case "idf.ninjaArgs":
      return getESPIDFSettingValue(preset, "ninjaArgs") || "";
    case "idf.buildPath":
      return preset.binaryDir || "";
    case "idf.sdkconfigDefaults":
      const sdkconfigDefaults = preset.cacheVariables?.SDKCONFIG_DEFAULTS;
      return sdkconfigDefaults ? sdkconfigDefaults.split(";") : "";
    case "idf.flashBaudRate":
      return getESPIDFSettingValue(preset, "flashBaudRate") || "";
    case "idf.monitorBaudRate":
      return getESPIDFSettingValue(preset, "monitorBaudRate") || "";
    case "idf.openOcdDebugLevel":
      const openOCDSettings = getESPIDFSettingValue(preset, "openOCD");
      return openOCDSettings?.debugLevel && openOCDSettings.debugLevel > -1
        ? openOCDSettings.debugLevel.toString()
        : "";
    case "idf.openOcdConfigs":
      const openOCDConfigs = getESPIDFSettingValue(preset, "openOCD");
      return openOCDConfigs?.configs && openOCDConfigs.configs.length
        ? openOCDConfigs.configs
        : "";
    case "idf.openOcdLaunchArgs":
      const openOCDArgs = getESPIDFSettingValue(preset, "openOCD");
      return openOCDArgs?.args && openOCDArgs.args.length
        ? openOCDArgs.args
        : "";
    case "idf.preBuildTask":
      const preBuildTask = getESPIDFSettingValue(preset, "tasks");
      return preBuildTask?.preBuild || "";
    case "idf.postBuildTask":
      const postBuildTask = getESPIDFSettingValue(preset, "tasks");
      return postBuildTask?.postBuild || "";
    case "idf.preFlashTask":
      const preFlashTask = getESPIDFSettingValue(preset, "tasks");
      return preFlashTask?.preFlash || "";
    case "idf.postFlashTask":
      const postFlashTask = getESPIDFSettingValue(preset, "tasks");
      return postFlashTask?.postFlash || "";
    case "idf.sdkconfigFilePath":
      return preset.cacheVariables?.SDKCONFIG || "";
    default:
      return "";
  }
}

/**
 * Helper function to get ESP-IDF setting value from ConfigurePreset
 */
function getESPIDFSettingValue(
  preset: ConfigurePreset,
  settingType: string
): any {
  const espIdfSettings =
    preset.vendor?.["espressif/vscode-esp-idf"]?.settings || [];
  const setting = espIdfSettings.find((s) => s.type === settingType);
  return setting ? setting.value : undefined;
}

/**
 * Converts ConfigurePreset to ProjectConfElement for store compatibility
 */
export function configurePresetToProjectConfElement(
  preset: ConfigurePreset
): ProjectConfElement {
  return convertConfigurePresetToProjectConfElement(
    preset,
    Uri.file(""),
    false
  );
}

/**
 * Converts ProjectConfElement to ConfigurePreset for store compatibility
 */
export function projectConfElementToConfigurePreset(
  name: string,
  element: ProjectConfElement
): ConfigurePreset {
  return convertProjectConfElementToConfigurePreset(name, element);
}

/**
 * Type guard to filter out undefined values from arrays.
 */
function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

/**
 * Converts a CMakePresets ConfigurePreset to the legacy ProjectConfElement format
 */
function convertConfigurePresetToProjectConfElement(
  preset: ConfigurePreset,
  workspaceFolder: Uri,
  resolvePaths: boolean = false
): ProjectConfElement {
  // Extract ESP-IDF specific settings from vendor section
  const espIdfSettings =
    preset.vendor?.["espressif/vscode-esp-idf"]?.settings || [];

  // Helper function to find setting by type
  const findSetting = (type: string): any => {
    const setting = espIdfSettings.find((s) => s.type === type);
    return setting ? setting.value : undefined;
  };

  // Extract values with defaults
  const compileArgs = findSetting("compileArgs") || [];
  const ninjaArgs = findSetting("ninjaArgs") || [];
  const flashBaudRate = findSetting("flashBaudRate") || "";
  const monitorBaudRate = findSetting("monitorBaudRate") || "";
  const openOCDSettings = findSetting("openOCD") || {
    debugLevel: -1,
    configs: [],
    args: [],
  };
  const taskSettings = findSetting("tasks") || {
    preBuild: "",
    preFlash: "",
    postBuild: "",
    postFlash: "",
  };

  // Process paths based on resolvePaths flag
  const binaryDir = preset.binaryDir || "";
  const buildDirectoryPath =
    resolvePaths && binaryDir
      ? path.isAbsolute(binaryDir)
        ? binaryDir
        : path.join(workspaceFolder.fsPath, binaryDir)
      : binaryDir;

  // Process SDKCONFIG_DEFAULTS - convert semicolon-separated string to array
  const sdkconfigDefaultsStr = preset.cacheVariables?.SDKCONFIG_DEFAULTS || "";
  const sdkconfigDefaults = sdkconfigDefaultsStr
    ? sdkconfigDefaultsStr.split(";")
    : [];

  return {
    build: {
      compileArgs: Array.isArray(compileArgs) ? compileArgs : [],
      ninjaArgs: Array.isArray(ninjaArgs) ? ninjaArgs : [],
      buildDirectoryPath,
      sdkconfigDefaults,
      sdkconfigFilePath: preset.cacheVariables?.SDKCONFIG || "",
    },
    env: preset.environment || {},
    idfTarget: preset.cacheVariables?.IDF_TARGET || "",
    flashBaudRate,
    monitorBaudRate,
    openOCD: {
      debugLevel: openOCDSettings.debugLevel || -1,
      configs: Array.isArray(openOCDSettings.configs)
        ? openOCDSettings.configs
        : [],
      args: Array.isArray(openOCDSettings.args) ? openOCDSettings.args : [],
    },
    tasks: {
      preBuild: taskSettings.preBuild || "",
      preFlash: taskSettings.preFlash || "",
      postBuild: taskSettings.postBuild || "",
      postFlash: taskSettings.postFlash || "",
    },
  };
}

/**
 * Converts a ProjectConfElement to CMakePresets ConfigurePreset format
 */
function convertProjectConfElementToConfigurePreset(
  name: string,
  element: ProjectConfElement
): ConfigurePreset {
  // Convert SDKCONFIG_DEFAULTS array to semicolon-separated string
  const sdkconfigDefaults =
    element.build.sdkconfigDefaults.length > 0
      ? element.build.sdkconfigDefaults.join(";")
      : undefined;

  const settings: ESPIDFSettings[] = [
    { type: "compileArgs", value: element.build.compileArgs },
    { type: "ninjaArgs", value: element.build.ninjaArgs },
    { type: "flashBaudRate", value: element.flashBaudRate },
    { type: "monitorBaudRate", value: element.monitorBaudRate },
    { type: "openOCD", value: element.openOCD },
    { type: "tasks", value: element.tasks },
  ];

  return {
    name,
    binaryDir: element.build.buildDirectoryPath || undefined,
    cacheVariables: {
      ...(element.idfTarget && { IDF_TARGET: element.idfTarget }),
      ...(sdkconfigDefaults && { SDKCONFIG_DEFAULTS: sdkconfigDefaults }),
      ...(element.build.sdkconfigFilePath && {
        SDKCONFIG: element.build.sdkconfigFilePath,
      }),
    },
    environment: Object.keys(element.env).length > 0 ? element.env : undefined,
    vendor: {
      "espressif/vscode-esp-idf": {
        settings,
      },
    },
  };
}
