// Copyright 2019 Espressif Systems (Shanghai) CO LTD
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { IdfTreeDataProvider } from "./idfComponentsDataProvider";
import { Logger } from "./logger/logger";
import * as utils from "./utils";
import { readParameter } from "./idfConfiguration";
import { showInfoNotificationWithAction } from "./logger/utils";
import { isSettingIDFTarget } from "./espIdf/setTarget";
import { pathExists } from "fs-extra";

/** Parsed subset of build/project_description.json; fields are optional for partial or evolving schemas. */
export interface IProjectDescription {
  version?: string;
  projectName?: string;
  projectVersion?: string;
  projectPath?: string;
  idfPath?: string;
  buildDir?: string;
  configFile?: string;
  configDefaults?: string;
  bootloaderElf?: string;
  appElf?: string;
  appBin?: string;
  buildType?: string;
  gitRevision?: string;
  target?: string;
  rev?: string;
  minRev?: string;
  maxRev?: string;
  phyDataPartition?: string;
  monitorBaud?: string;
  monitorToolPrefix?: string;
  cCompiler?: string;
  configEnvironment?: {
    ComponentKconfigs?: string;
    ComponentKconfigsProjbuild?: string;
  };
  commonComponentReqs?: string[];
  buildComponents?: string[];
  buildComponentPaths?: string[];
  buildComponentInfo?: { [key: string]: any };
  allComponentInfo?: { [key: string]: any };
  gdbinitFiles?: { [key: string]: string };
  debugArgumentsOpenOCD?: string;
}

function optString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function initSelectedWorkspace(status?: vscode.StatusBarItem) {
  const workspaceRoot =
    vscode.workspace.workspaceFolders &&
    vscode.workspace.workspaceFolders.length
      ? vscode.workspace.workspaceFolders[0]
      : undefined;
  if (!workspaceRoot) {
    return;
  }
  updateIdfComponentsTree(workspaceRoot.uri);
  const workspaceFolderInfo = {
    clickCommand: "espIdf.pickAWorkspaceFolder",
    currentWorkSpace: workspaceRoot.name,
    tooltip: workspaceRoot.uri.fsPath,
    text: "${file-directory}",
  };
  if (status) {
    utils.updateStatus(status, workspaceFolderInfo);
  }
  return workspaceRoot.uri;
}

let idfDataProvider: IdfTreeDataProvider;
export function updateIdfComponentsTree(workspaceFolder: vscode.Uri) {
  if (typeof idfDataProvider === "undefined") {
    idfDataProvider = new IdfTreeDataProvider(workspaceFolder);
    vscode.window.registerTreeDataProvider("idfComponents", idfDataProvider);
  }
  idfDataProvider.refresh(workspaceFolder);
}

export async function getProjectDescriptionJson(
  workspaceFolder: vscode.Uri
): Promise<IProjectDescription | undefined> {
  const buildDirPath = readParameter(
    "idf.buildPath",
    workspaceFolder
  ) as string;
  try {
    const projDescJsonPath = path.join(
      buildDirPath,
      "project_description.json"
    );
    const doesExists = await pathExists(projDescJsonPath);
    if (!doesExists) {
      return undefined;
    }
    const projDescJsonContent = await fs.promises.readFile(projDescJsonPath);
    const projDescJson = JSON.parse(projDescJsonContent.toString()) as Record<
      string,
      unknown
    >;
    if (
      !projDescJson ||
      typeof projDescJson !== "object" ||
      Array.isArray(projDescJson)
    ) {
      return undefined;
    }
    const env = projDescJson.config_environment;
    const envObj =
      env !== null && typeof env === "object" && !Array.isArray(env)
        ? (env as Record<string, unknown>)
        : undefined;
    const projectDescriptionObj: IProjectDescription = {
      version: optString(projDescJson.version),
      projectName: optString(projDescJson.project_name),
      projectVersion: optString(projDescJson.project_version),
      projectPath: optString(projDescJson.project_path),
      idfPath: optString(projDescJson.idf_path),
      buildDir: optString(projDescJson.build_dir),
      configFile: optString(projDescJson.config_file),
      configDefaults: optString(projDescJson.config_defaults),
      bootloaderElf: optString(projDescJson.bootloader_elf),
      appElf: optString(projDescJson.app_elf),
      appBin: optString(projDescJson.app_bin),
      buildType: optString(projDescJson.build_type),
      gitRevision: optString(projDescJson.git_revision),
      target: optString(projDescJson.target),
      rev: optString(projDescJson.rev),
      minRev: optString(projDescJson.min_rev),
      maxRev: optString(projDescJson.max_rev),
      phyDataPartition: optString(projDescJson.phy_data_partition),
      monitorBaud: optString(projDescJson.monitor_baud),
      monitorToolPrefix: optString(projDescJson.monitor_tool_prefix),
      cCompiler: optString(projDescJson.c_compiler),
      configEnvironment: envObj
        ? {
            ComponentKconfigs: optString(envObj.COMPONENT_KCONFIGS),
            ComponentKconfigsProjbuild: optString(
              envObj.COMPONENT_KCONFIGS_PROJBUILD
            ),
          }
        : undefined,
      commonComponentReqs: Array.isArray(projDescJson.common_component_reqs)
        ? (projDescJson.common_component_reqs as string[])
        : undefined,
      buildComponents: Array.isArray(projDescJson.build_components)
        ? (projDescJson.build_components as string[])
        : undefined,
      buildComponentPaths: Array.isArray(projDescJson.build_component_paths)
        ? (projDescJson.build_component_paths as string[])
        : undefined,
      buildComponentInfo:
        projDescJson.build_component_info !== null &&
        typeof projDescJson.build_component_info === "object" &&
        !Array.isArray(projDescJson.build_component_info)
          ? (projDescJson.build_component_info as { [key: string]: any })
          : undefined,
      allComponentInfo:
        projDescJson.all_component_info !== null &&
        typeof projDescJson.all_component_info === "object" &&
        !Array.isArray(projDescJson.all_component_info)
          ? (projDescJson.all_component_info as { [key: string]: any })
          : undefined,
      gdbinitFiles:
        projDescJson.gdbinit_files !== null &&
        typeof projDescJson.gdbinit_files === "object" &&
        !Array.isArray(projDescJson.gdbinit_files)
          ? (projDescJson.gdbinit_files as { [key: string]: string })
          : undefined,
      debugArgumentsOpenOCD: optString(projDescJson.debug_arguments_openocd),
    };
    return projectDescriptionObj;
  } catch (error) {
    Logger.error(
      `Error reading project description JSON from ${buildDirPath}`,
      error as Error,
      "workspaceConfig getProjectDescriptionJson"
    );
    return undefined;
  }
}

export async function getSDKConfigFilePath(
  workspacePath: vscode.Uri
): Promise<string> {
  try {
    const projDescObj = await getProjectDescriptionJson(workspacePath);
    if (projDescObj?.configFile) {
      const configFilePath = path.isAbsolute(projDescObj.configFile)
        ? projDescObj.configFile
        : path.join(workspacePath.fsPath, projDescObj.configFile);
      if (await pathExists(configFilePath)) {
        return configFilePath;
      }
    }
    let sdkconfigFilePath = readParameter(
      "idf.sdkconfigFilePath",
      workspacePath
    ) as string;
    if (!sdkconfigFilePath) {
      sdkconfigFilePath = path.join(workspacePath.fsPath, "sdkconfig");
    }
    return sdkconfigFilePath;
  } catch (error) {
    const errMsg =
      error && typeof error === "object" && "message" in error
        ? (error as Error).message
        : String(error);
    Logger.error(errMsg, error as Error, "workspaceConfig getSdkconfigPath");
    return path.join(workspacePath.fsPath, "sdkconfig");
  }
}

export async function getProjectName(
  workspacePath: vscode.Uri
): Promise<string> {
  const projectDescription = await getProjectDescriptionJson(workspacePath);
  if (projectDescription && projectDescription.projectName) {
    return projectDescription.projectName;
  }
  throw new Error("Failed to get project name from project description.");
}

export async function getProjectElfFilePath(
  workspacePath: vscode.Uri
): Promise<string> {
  const projectDescription = await getProjectDescriptionJson(workspacePath);
  if (projectDescription && projectDescription.appElf) {
    const buildDirPath = readParameter(
      "idf.buildPath",
      workspacePath
    ) as string;
    if (!buildDirPath) {
      throw new Error("Failed to get build directory path for ELF file path.");
    }
    const elfFilePath = path.join(buildDirPath, projectDescription.appElf);
    return elfFilePath;
  }
  throw new Error(
    "Failed to get project ELF file name from project description."
  );
}

export async function getProjectMapFilePath(
  workspacePath: vscode.Uri
): Promise<string> {
  const projectName = await getProjectName(workspacePath);
  if (!projectName) {
    throw new Error("Failed to get project name for MAP file path.");
  }
  const buildDirPath = readParameter("idf.buildPath", workspacePath) as string;
  if (!buildDirPath) {
    throw new Error("Failed to get build directory path for MAP file path.");
  }
  const mapFilePath = path.join(buildDirPath, `${projectName}.map`);
  return mapFilePath;
}

export async function getIdfTargetFromSdkconfig(
  workspacePath: vscode.Uri,
  statusItem?: vscode.StatusBarItem
) {
  try {
    const configIdfTarget = await utils.getConfigValueFromSDKConfig(
      "CONFIG_IDF_TARGET",
      workspacePath
    );
    let idfTarget = configIdfTarget.replace(/\"/g, "");
    const customExtraVars = readParameter(
      "idf.customExtraVars",
      workspacePath
    ) as { [key: string]: string };
    const customIdfTarget = customExtraVars["IDF_TARGET"];

    if (idfTarget && customIdfTarget && idfTarget !== customIdfTarget) {
      if (!isSettingIDFTarget) {
        showInfoNotificationWithAction(
          vscode.l10n.t(
            'IDF_TARGET mismatch: SDKConfig value is "{0}" but settings value is "{1}".',
            idfTarget,
            customIdfTarget
          ),
          vscode.l10n.t("Set IDF_TARGET"),
          () => vscode.commands.executeCommand("espIdf.setTarget")
        );
      }
    }

    if (!idfTarget) {
      idfTarget = customIdfTarget;
    }
    if (!idfTarget) {
      idfTarget = "esp32";
    }
    if (statusItem) {
      statusItem.text = "$(chip) " + idfTarget;
    }
    return idfTarget;
  } catch (error) {
    const customExtraVars = readParameter(
      "idf.customExtraVars",
      workspacePath
    ) as { [key: string]: string };
    let idfTarget = customExtraVars["IDF_TARGET"] || "esp32";
    if (statusItem) {
      statusItem.text = `$(chip) ${idfTarget}`;
    }
    return idfTarget;
  }
}
