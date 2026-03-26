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

export interface IProjectDescription {
  version: string;
  projectName: string;
  projectVersion: string;
  projectPath: string;
  idfPath: string;
  buildDir: string;
  configFile: string;
  configDefaults: string;
  bootloaderElf: string;
  appElf: string;
  appBin: string;
  buildType: string;
  gitRevision: string;
  target: string;
  rev: string;
  minRev: string;
  maxRev: string;
  phyDataPartition: string;
  monitorBaud: string;
  monitorToolPrefix: string;
  cCompiler: string;
  configEnvironment: {
    ComponentKconfigs: string;
    ComponentKconfigsProjbuild: string;
  };
  commonComponentReqs: string[];
  buildComponents: string[];
  buildComponentPaths: string[];
  buildComponentInfo: { [key: string]: any };
  allComponentInfo: { [key: string]: any };
  gdbinitFiles: { [key: string]: string };
  debugArgumentsOpenOCD: string;
}

export function initSelectedWorkspace(status?: vscode.StatusBarItem) {
  const workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
  updateIdfComponentsTree(workspaceRoot);
  const workspaceFolderInfo = {
    clickCommand: "espIdf.pickAWorkspaceFolder",
    currentWorkSpace: vscode.workspace.workspaceFolders[0].name,
    tooltip: vscode.workspace.workspaceFolders[0].uri.fsPath,
    text: "${file-directory}",
  };
  if (status) {
    utils.updateStatus(status, workspaceFolderInfo);
  }
  return workspaceRoot;
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
  buildDir: string
): Promise<IProjectDescription | undefined> {
  try {
    const projDescJsonPath = path.join(buildDir, "project_description.json");
    const doesExists = await pathExists(projDescJsonPath);
    if (!doesExists) {
      return undefined;
    }
    const projDescJsonContent = await fs.promises.readFile(projDescJsonPath);
    const projDescJson = JSON.parse(projDescJsonContent.toString());
    const projectDescriptionObj: IProjectDescription = {
      version: projDescJson.version,
      projectName: projDescJson.project_name,
      projectVersion: projDescJson.project_version,
      projectPath: projDescJson.project_path,
      idfPath: projDescJson.idf_path,
      buildDir: projDescJson.build_dir,
      configFile: projDescJson.config_file,
      configDefaults: projDescJson.config_defaults,
      bootloaderElf: projDescJson.bootloader_elf,
      appElf: projDescJson.app_elf,
      appBin: projDescJson.app_bin,
      buildType: projDescJson.build_type,
      gitRevision: projDescJson.git_revision,
      target: projDescJson.target,
      rev: projDescJson.rev,
      minRev: projDescJson.min_rev,
      maxRev: projDescJson.max_rev,
      phyDataPartition: projDescJson.phy_data_partition,
      monitorBaud: projDescJson.monitor_baud,
      monitorToolPrefix: projDescJson.monitor_tool_prefix,
      cCompiler: projDescJson.c_compiler,
      configEnvironment: {
        ComponentKconfigs: projDescJson.config_environment.COMPONENT_KCONFIGS,
        ComponentKconfigsProjbuild:
          projDescJson.config_environment.COMPONENT_KCONFIGS_PROJBUILD,
      },
      commonComponentReqs: projDescJson.common_component_reqs,
      buildComponents: projDescJson.build_components,
      buildComponentPaths: projDescJson.build_component_paths,
      buildComponentInfo: projDescJson.build_component_info,
      allComponentInfo: projDescJson.all_component_info,
      gdbinitFiles: projDescJson.gdbinit_files,
      debugArgumentsOpenOCD: projDescJson.debug_arguments_openocd,
    };
    return projectDescriptionObj;
  } catch (error) {
    Logger.error(
      `Error reading project description JSON from ${buildDir}`,
      error,
      "workspaceConfig getProjectDescriptionJson"
    );
    return undefined;
  }
}

export async function getSDKConfigFilePath(
  workspacePath: vscode.Uri
): Promise<string | undefined> {
  try {
    if (!workspacePath) {
      return;
    }
    const buildDir = readParameter("idf.buildPath", workspacePath) as string;
    const projDescObj = await getProjectDescriptionJson(buildDir);
    if (projDescObj && projDescObj.configFile) {
      return projDescObj.configFile;
    }
    let sdkconfigFilePath = "";
    if (!sdkconfigFilePath) {
      sdkconfigFilePath = readParameter(
        "idf.sdkconfigFilePath",
        workspacePath
      ) as string;
    }
    if (!sdkconfigFilePath) {
      sdkconfigFilePath = path.join(workspacePath.fsPath, "sdkconfig");
    }
    return sdkconfigFilePath;
  } catch (error) {
    const errMsg = error && error.message ? error.message : error;
    Logger.error(errMsg, error, "workspaceConfig getSdkconfigPath");
  }
}

export async function getProjectName(buildDir: string): Promise<string> {
  try {
    const projectDescription = await getProjectDescriptionJson(buildDir);
    if (projectDescription && projectDescription.projectName) {
      return projectDescription.projectName;
    }
  } catch (error) {
    const errMsg = error && error.message ? error.message : error;
    Logger.error(errMsg, error, "workspaceConfig getProjectName");
  }
  return "";
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
