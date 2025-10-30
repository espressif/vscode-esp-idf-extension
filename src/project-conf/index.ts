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
import { resolveVariables, readParameter } from "../idfConfiguration";

const ESP_IDF_VENDOR_KEY = "espressif/vscode-esp-idf";
const CMAKE_PRESET_VERSION = 3;
const CMAKE_PRESET_SCHEMA_VERSION = 1;

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

/**
 * Updates the IDF target (e.g., esp32, esp32s3) for the currently selected project configuration.
 * The IDF_TARGET is stored in the cacheVariables section of the ConfigurePreset.
 * @param idfTarget The target chip name (e.g., "esp32", "esp32s3", "esp32c3")
 * @param workspaceFolder The workspace folder Uri where the configuration files are located
 */
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
      config.vendor = { [ESP_IDF_VENDOR_KEY]: { settings: [] } };
    }
    if (!config.vendor[ESP_IDF_VENDOR_KEY]) {
      config.vendor[ESP_IDF_VENDOR_KEY] = { settings: [] };
    }

    // Remove existing openOCD setting
    config.vendor[ESP_IDF_VENDOR_KEY].settings = 
      config.vendor[ESP_IDF_VENDOR_KEY].settings.filter(
        (setting) => setting.type !== "openOCD"
      );

    // Add new openOCD setting
    const openOcdDebugLevel = readParameter(
            "idf.openOcdDebugLevel",
            this.workspace
          ) as string;
    config.vendor[ESP_IDF_VENDOR_KEY].settings.push({
      type: "openOCD",
      value: {
        debugLevel: openOcdDebugLevel || 2,
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
 * Determines the source file for a configuration preset (CMakePresets.json vs CMakeUserPresets.json).
 * User presets take precedence over project presets when both contain the same configuration name.
 * This is important for determining where to save modifications to a configuration.
 * 
 * @param workspaceFolder The workspace folder Uri where the configuration files are located
 * @param configName The name of the configuration preset to locate
 * @returns 'user' if found in CMakeUserPresets.json, 'project' if in CMakePresets.json, 'unknown' if not found
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
 * Saves a configuration preset to the CMakeUserPresets.json file.
 * If the file doesn't exist, it will be created. If a preset with the same name already exists,
 * it will be updated. CMakeUserPresets.json is gitignored and used for user-specific overrides.
 * 
 * @param workspaceFolder The workspace folder Uri where CMakeUserPresets.json is located
 * @param configName The name of the configuration preset to save
 * @param configPreset The ConfigurePreset object to save
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
        version: CMAKE_PRESET_VERSION,
        configurePresets: []
      };
    }
  } else {
    userPresets = {
      version: CMAKE_PRESET_VERSION,
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
 * Saves a configuration preset to the CMakePresets.json file.
 * If the file doesn't exist, it will be created. If a preset with the same name already exists,
 * it will be updated. CMakePresets.json is typically committed to version control.
 * 
 * @param workspaceFolder The workspace folder Uri where CMakePresets.json is located
 * @param configName The name of the configuration preset to save
 * @param configPreset The ConfigurePreset object to save
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
        version: CMAKE_PRESET_VERSION,
        configurePresets: []
      };
    }
  } else {
    projectPresets = {
      version: CMAKE_PRESET_VERSION,
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

/**
 * Saves project configuration elements to CMakePresets.json file.
 * This function writes multiple ConfigurePreset objects to the project's CMakePresets.json file.
 * @param workspaceFolder The workspace folder Uri where the configuration file will be saved
 * @param projectConfElements An object mapping configuration names to their ConfigurePreset objects
 */
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
    version: CMAKE_PRESET_VERSION,
    cmakeMinimumRequired: { major: 3, minor: 23, patch: 0 },
    configurePresets,
  };

  await writeJson(projectConfFilePath.fsPath, cmakePresets, {
    spaces: 2,
  });
}

/**
 * Legacy compatibility function to save project configuration elements to CMakePresets.json.
 * This function converts legacy ProjectConfElement objects to ConfigurePreset format and saves them.
 * Used during migration from the old esp_idf_project_configuration.json format.
 * @param workspaceFolder The workspace folder Uri where the configuration file will be saved
 * @param projectConfElements An object mapping configuration names to their legacy ProjectConfElement objects
 * @deprecated Use saveProjectConfFile instead for new code
 */
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
    version: CMAKE_PRESET_VERSION,
    cmakeMinimumRequired: { major: 3, minor: 23, patch: 0 },
    configurePresets,
  };

  await writeJson(projectConfFilePath.fsPath, cmakePresets, {
    spaces: 2,
  });
}

/**
 * Maps legacy parameter names to their corresponding values in a ProjectConfElement (legacy format).
 * This function is used for backward compatibility when processing legacy configuration files
 * that use variable substitution with parameter names like ${config:idf.buildPath}.
 * 
 * @param param The legacy parameter name (e.g., "idf.buildPath", "idf.cmakeCompilerArgs")
 * @param currentProjectConf The ProjectConfElement to extract the value from
 * @returns The parameter value, or empty string if not found or undefined
 * @deprecated Use getConfigurePresetParameterValue for new code working with ConfigurePresets
 */
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
 * Substitutes variables in a string for legacy ProjectConfElement format.
 * Supports variable patterns like:
 * - ${workspaceFolder} or ${workspaceRoot}: Replaced with workspace folder path
 * - ${env:VARNAME}: Replaced with environment variable value
 * - ${config:PARAM}: Replaced with configuration parameter value
 * 
 * This is the legacy version; for ConfigurePreset use substituteVariablesInConfigurePreset.
 * 
 * @param text The input string potentially containing variables
 * @param workspaceFolder The workspace folder Uri to resolve ${workspaceFolder}
 * @param config The legacy configuration object for resolving ${config:*} variables
 * @returns The string with variables substituted, or undefined if input was undefined/null
 * @deprecated Use substituteVariablesInConfigurePreset for new code
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
    Logger.warnNotify(
      `Invalid ${fileName} format detected. Please ensure the file follows the CMakePresets specification.`
    );
  }

  return rawPresets;
}

/**
 * Resolves inheritance for a preset by merging it with its parent presets.
 * CMakePresets supports inheritance where a preset can inherit from one or more parent presets
 * using the "inherits" field. This function recursively resolves the inheritance chain and
 * merges all parent properties, with child properties overriding parent properties.
 * 
 * @param preset The preset to resolve inheritance for (may have an "inherits" field)
 * @param allPresets All available presets from both CMakePresets.json and CMakeUserPresets.json
 * @returns The preset with inheritance fully resolved and the "inherits" field removed
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
 * Merges two presets, with the child preset overriding the parent preset.
 * Used during inheritance resolution to combine parent and child preset properties.
 * For object properties (cacheVariables, environment, vendor), child properties are merged
 * into parent properties rather than replacing them entirely.
 * 
 * @param parent The parent preset (provides default values)
 * @param child The child preset (takes precedence when properties conflict)
 * @returns A new merged preset with child properties overriding parent properties
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
      [ESP_IDF_VENDOR_KEY]: {
        settings: [
          ...(parent.vendor?.[ESP_IDF_VENDOR_KEY]?.settings || []),
          ...(child.vendor?.[ESP_IDF_VENDOR_KEY]?.settings || []),
        ],
      },
    };
  }

  return merged;
}

/**
 * Checks for the legacy project configuration file (esp_idf_project_configuration.json)
 * and prompts the user to migrate it to the new CMakePresets.json format if found.
 * This ensures a smooth transition from the old configuration format to the new one.
 * 
 * @param workspaceFolder The workspace folder Uri where the legacy file might be located
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
 * Processes legacy project configuration format (esp_idf_project_configuration.json).
 * Converts the old configuration structure to the ProjectConfElement format, handling
 * variable substitution and path resolution. This function is used during migration
 * from the legacy format to CMakePresets.
 * 
 * @param rawConfig The raw legacy configuration object
 * @param workspaceFolder The workspace folder Uri for variable substitution and path resolution
 * @param resolvePaths If true, resolves relative paths to absolute paths
 * @returns A ProjectConfElement with all legacy settings converted and processed
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
 * Processes variable substitution and path resolution for a ConfigurePreset.
 * This is a complex function that handles the transformation of raw ConfigurePreset data
 * by substituting variables (like ${workspaceFolder}, ${env:VAR}) and optionally resolving
 * relative paths to absolute paths.
 * 
 * The function processes:
 * - binaryDir: The build output directory path
 * - cacheVariables: CMake cache variables (like IDF_TARGET, SDKCONFIG)
 * - environment: Environment variables for the build
 * - vendor: ESP-IDF specific vendor settings (OpenOCD configs, tasks, etc.)
 * 
 * @param preset The raw ConfigurePreset to process
 * @param workspaceFolder The workspace folder Uri used for resolving ${workspaceFolder} and relative paths
 * @param resolvePaths If true, converts relative paths to absolute paths; if false, returns paths as-is for display
 * @returns A new ConfigurePreset with all variables substituted and paths optionally resolved
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
 * Processes path strings in ConfigurePreset by substituting variables and optionally resolving to absolute paths.
 * Handles paths like "build" or "${workspaceFolder}/build" and converts them based on the resolvePaths flag.
 * @param pathValue The raw path string from the preset (may contain variables)
 * @param workspaceFolder The workspace folder Uri used for variable substitution and path resolution
 * @param preset The ConfigurePreset containing environment and other variables for substitution
 * @param resolvePaths If true, converts relative paths to absolute paths; if false, only substitutes variables
 * @returns The processed path string with variables substituted and optionally resolved to absolute path
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
 * Processes CMake cache variables in ConfigurePreset by substituting variables and resolving paths.
 * Cache variables include important CMake settings like IDF_TARGET, SDKCONFIG, and SDKCONFIG_DEFAULTS.
 * String values undergo variable substitution, and path-related variables (SDKCONFIG, *PATH) are
 * optionally resolved to absolute paths when resolvePaths is true.
 * @param cacheVariables The cache variables object from the preset
 * @param workspaceFolder The workspace folder Uri for variable substitution and path resolution
 * @param preset The ConfigurePreset containing environment variables for substitution
 * @param resolvePaths If true, resolves relative paths to absolute for path-related variables
 * @returns A new cache variables object with all substitutions and resolutions applied
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
 * Processes environment variables in ConfigurePreset by substituting variable references.
 * Environment variables can reference other variables using ${env:VAR}, ${workspaceFolder}, etc.
 * These variables are available to the build process and can be used in build scripts.
 * @param environment The environment variables object from the preset
 * @param workspaceFolder The workspace folder Uri for variable substitution
 * @param preset The ConfigurePreset containing other variables for substitution
 * @param resolvePaths Currently unused for environment variables but kept for consistency
 * @returns A new environment object with all variable references substituted
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
 * Processes ESP-IDF vendor-specific settings in ConfigurePreset.
 * Vendor settings contain extension-specific configuration like:
 * - OpenOCD configuration (debug level, configs, args)
 * - Build tasks (preBuild, postBuild, preFlash, postFlash)
 * - Compiler arguments and ninja arguments
 * - Flash and monitor baud rates
 * 
 * Each setting is processed to substitute variables in string values, arrays, and nested objects.
 * @param vendor The vendor settings object from the preset (under "espressif/vscode-esp-idf" key)
 * @param workspaceFolder The workspace folder Uri for variable substitution
 * @param preset The ConfigurePreset containing other variables for substitution
 * @param resolvePaths If true, paths in vendor settings will be resolved to absolute paths
 * @returns A new vendor settings object with all variables substituted
 */
async function processConfigurePresetVendor(
  vendor: ESPIDFVendorSettings,
  workspaceFolder: Uri,
  preset: ConfigurePreset,
  resolvePaths: boolean
): Promise<ESPIDFVendorSettings> {
  const processedVendor: ESPIDFVendorSettings = {
    [ESP_IDF_VENDOR_KEY]: {
      settings: [],
      schemaVersion: 1
    },
  };

  const espIdfSettings = vendor[ESP_IDF_VENDOR_KEY]?.settings || [];

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

    processedVendor[ESP_IDF_VENDOR_KEY].settings.push(processedSetting);
  }

  return processedVendor;
}

/**
 * Processes object values within vendor settings (e.g., OpenOCD configuration objects).
 * Recursively processes string and array values within objects to substitute variables.
 * For example, processes objects like { debugLevel: 2, configs: ["${env:BOARD_CONFIG}"], args: [] }
 * @param obj The object to process (from a vendor setting value)
 * @param workspaceFolder The workspace folder Uri for variable substitution
 * @param preset The ConfigurePreset containing other variables for substitution
 * @param resolvePaths Currently unused but kept for future path resolution in objects
 * @returns A new object with all string and array values processed for variable substitution
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
 * Processes variable substitution and path resolution for ProjectConfElement (legacy compatibility).
 * This function provides backward compatibility for code that still uses the legacy ProjectConfElement
 * format. It delegates to processLegacyProjectConfig for the actual processing.
 * 
 * @param element The ProjectConfElement to process
 * @param workspaceFolder The workspace folder Uri for variable substitution and path resolution
 * @param resolvePaths If true, resolves relative paths to absolute paths
 * @returns A new ProjectConfElement with all variables substituted and paths resolved
 * @deprecated Use processConfigurePresetVariables for new code
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
 * Retrieves parameter values from a ConfigurePreset for variable substitution.
 * This function maps legacy parameter names (like "idf.buildPath") to their corresponding
 * values in the ConfigurePreset structure. Used to support ${config:idf.buildPath} style
 * variable references in configuration strings.
 * 
 * Supported parameters include:
 * - idf.cmakeCompilerArgs, idf.ninjaArgs
 * - idf.buildPath, idf.sdkconfigDefaults, idf.sdkconfigFilePath
 * - idf.flashBaudRate, idf.monitorBaudRate
 * - idf.openOcdDebugLevel, idf.openOcdConfigs, idf.openOcdLaunchArgs
 * - idf.preBuildTask, idf.postBuildTask, idf.preFlashTask, idf.postFlashTask
 * 
 * @param param The parameter name to look up (e.g., "idf.buildPath")
 * @param preset The ConfigurePreset to extract the value from
 * @returns The parameter value (string, array, or empty string if not found)
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
 * Helper function to retrieve ESP-IDF specific setting values from a ConfigurePreset's vendor section.
 * ESP-IDF settings are stored in the vendor section under the "espressif/vscode-esp-idf" key.
 * Each setting has a type (e.g., "openOCD", "tasks", "compileArgs") and a value.
 * 
 * @param preset The ConfigurePreset containing vendor settings
 * @param settingType The type of setting to retrieve (e.g., "openOCD", "tasks", "flashBaudRate")
 * @returns The setting value if found, or undefined if the setting doesn't exist
 */
function getESPIDFSettingValue(
  preset: ConfigurePreset,
  settingType: string
): any {
  const espIdfSettings =
    preset.vendor?.[ESP_IDF_VENDOR_KEY]?.settings || [];
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
 * Useful with array.filter() to remove undefined elements while maintaining type safety.
 * @param value The value to check
 * @returns True if the value is defined (not undefined), false otherwise
 */
function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

/**
 * Converts a CMakePresets ConfigurePreset to the legacy ProjectConfElement format.
 * This conversion is necessary for backward compatibility with code that expects the legacy format.
 * Extracts ESP-IDF specific settings from the vendor section and maps them to the legacy structure.
 * 
 * @param preset The ConfigurePreset to convert
 * @param workspaceFolder The workspace folder Uri for path resolution
 * @param resolvePaths If true, resolves relative paths to absolute paths
 * @returns A ProjectConfElement representing the same configuration in the legacy format
 */
function convertConfigurePresetToProjectConfElement(
  preset: ConfigurePreset,
  workspaceFolder: Uri,
  resolvePaths: boolean = false
): ProjectConfElement {
  // Extract ESP-IDF specific settings from vendor section
  const espIdfSettings =
    preset.vendor?.[ESP_IDF_VENDOR_KEY]?.settings || [];

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
 * Converts a legacy ProjectConfElement to CMakePresets ConfigurePreset format.
 * This conversion is used during migration and when saving configurations from legacy code.
 * Maps the legacy structure to the CMakePresets format, storing ESP-IDF specific settings
 * in the vendor section under "espressif/vscode-esp-idf".
 * 
 * @param name The name for the configuration preset
 * @param element The ProjectConfElement to convert
 * @returns A ConfigurePreset representing the same configuration in the CMakePresets format
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
      [ESP_IDF_VENDOR_KEY]: {
        settings,
        schemaVersion: CMAKE_PRESET_SCHEMA_VERSION
      },
    },
  };
}
