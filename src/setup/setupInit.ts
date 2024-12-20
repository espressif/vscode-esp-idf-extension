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

import { ConfigurationTarget, Progress, StatusBarItem, Uri, env } from "vscode";
import { IdfToolsManager } from "../idfToolsManager";
import * as utils from "../utils";
import { getEspIdfTags, getEspIdfVersions } from "./espIdfVersionList";
import { IdfMirror, IdfSetup, IEspIdfLink } from "../views/setup/types";
import { getPythonList } from "./installPyReqs";
import { pathExists } from "fs-extra";
import path from "path";
import { Logger } from "../logger/logger";
import * as idfConf from "../idfConfiguration";
import {
  getPropertyFromJson,
  getSelectedIdfInstalled,
  loadIdfSetupsFromEspIdfJson,
} from "./espIdfJson";
import { checkPyVenv } from "./setupValidation/pythonEnv";
import { packageJson } from "../utils";
import { getVirtualEnvPythonPath } from "../pythonManager";
import { CommandKeys, createCommandDictionary } from "../cmdTreeView/cmdStore";
import { getIdfSetups } from "../eim/getExistingSetups";
import { getCurrentIdfSetup } from "../versionSwitcher";

export interface ISetupInitArgs {
  downloadMirror: IdfMirror;
  espIdfPath: string;
  espToolsPath: string;
  existingIdfSetups: IdfSetup[];
  extensionVersion: string;
  espIdfVersionsList: IEspIdfLink[];
  espIdfTagsList: IEspIdfLink[];
  gitPath: string;
  gitVersion: string;
  hasPrerequisites: boolean;
  onReqPkgs?: string[];
  pythonVersions: string[];
  saveScope: number;
  workspaceFolder: Uri;
  espIdfStatusBar: StatusBarItem;
}

export interface IPreviousInstallResult {
  espIdfPath: string;
  toolsPath: string;
  gitPath: string;
  gitVersion: string;
  existingIdfSetups: IdfSetup[];
}

export interface IExistingSetup {}

export async function checkPreviousInstall(
  workspaceFolder: Uri
): Promise<IPreviousInstallResult> {
  const containerPath =
    process.platform === "win32" ? process.env.USERPROFILE : process.env.HOME;

  const customExtraVars = idfConf.readParameter(
    "idf.customExtraVars",
    workspaceFolder
  ) as { [key: string]: string };
  const confEspIdfPath = customExtraVars["IDF_PATH"];
  const confToolsPath = customExtraVars["IDF_TOOLS_PATH"];

  const toolsPath =
    confToolsPath ||
    process.env.IDF_TOOLS_PATH ||
    path.join(containerPath, ".espressif");
  let espIdfPath =
    confEspIdfPath ||
    process.env.IDF_PATH ||
    path.join(containerPath, "esp", "esp-idf");

  let idfPathExists = await pathExists(espIdfPath);
  if (!idfPathExists && process.platform === "win32") {
    espIdfPath = path.join(process.env.USERPROFILE, "Desktop", "esp-idf");
  }

  const espIdfJsonPath = path.join(toolsPath, "esp_idf.json");
  const espIdfJsonExists = await pathExists(espIdfJsonPath);
  let gitPath =
    idfConf.readParameter("idf.gitPath", workspaceFolder) || "/usr/bin/git";
  let existingIdfSetups: IdfSetup[] = [];
  if (espIdfJsonExists) {
    const idfInstalled = await getSelectedIdfInstalled(toolsPath);
    if (idfInstalled && idfInstalled.path) {
      espIdfPath = idfInstalled.path;
    }
    const gitPathFromJson = (await getPropertyFromJson(
      toolsPath,
      "gitPath"
    )) as string;
    const gitPathExists = await pathExists(gitPathFromJson);
    if (gitPathExists) {
      gitPath = gitPathFromJson;
    }
    existingIdfSetups = await loadIdfSetupsFromEspIdfJson(toolsPath);
  }

  const gitVersion = await utils.checkGitExists(containerPath, gitPath);

  return {
    espIdfPath,
    toolsPath,
    gitPath,
    gitVersion,
    existingIdfSetups,
  };
}

export async function getSetupInitialValues(
  extensionPath: string,
  progress: Progress<{ message: string; increment: number }>,
  workspaceFolder: Uri
) {
  progress.report({ increment: 20, message: "Getting ESP-IDF versions..." });
  const espIdfVersionsList = await getEspIdfVersions(extensionPath);
  progress.report({ increment: 10, message: "Getting ESP-IDF Tags" });
  const espIdfTagsList = await getEspIdfTags();
  progress.report({ increment: 10, message: "Getting Python versions..." });
  const pythonVersions = await getPythonList(extensionPath);
  let idfSetups = await getIdfSetups(false, false);
  const onlyValidIdfSetups = idfSetups.filter((i) => i.isValid);
  const currentIdfSetup = await getCurrentIdfSetup(workspaceFolder);
  const isCurrentSetupInList = onlyValidIdfSetups.findIndex((idfSetup) => {
    return (
      idfSetup.idfPath === currentIdfSetup.idfPath &&
      idfSetup.toolsPath === currentIdfSetup.toolsPath
    );
  });
  if (currentIdfSetup.isValid && isCurrentSetupInList === -1) {
    onlyValidIdfSetups.push(currentIdfSetup);
  }
  const extensionVersion = packageJson.version as string;
  const saveScope = idfConf.readParameter("idf.saveScope") as number;
  const initialDownloadMirror =
    env.language.toLowerCase().indexOf("zh-cn") !== -1 ||
    env.language.toLowerCase().indexOf("zh-tw") !== -1
      ? IdfMirror.Espressif
      : IdfMirror.Github;
  const setupInitArgs = {
    downloadMirror: initialDownloadMirror,
    espIdfVersionsList,
    espIdfTagsList,
    extensionVersion,
    existingIdfSetups: onlyValidIdfSetups,
    pythonVersions,
    saveScope,
    workspaceFolder,
    espIdfPath: undefined,
    espToolsPath: undefined,
    gitPath: undefined,
    gitVersion: undefined,
    espIdfStatusBar: undefined,
    hasPrerequisites: undefined,
  } as ISetupInitArgs;

  try {
    progress.report({
      increment: 10,
      message: "Checking for previous install...",
    });

    // Get initial paths
    const prevInstall = await checkPreviousInstall(workspaceFolder);
    if (process.platform !== "win32") {
      setupInitArgs.hasPrerequisites =
        prevInstall.gitVersion !== "Not found" &&
        pythonVersions &&
        pythonVersions.length > 0;

      const canAccessCMake = await utils.isBinInPath(
        "cmake",
        extensionPath,
        process.env
      );

      if (canAccessCMake === "") {
        setupInitArgs.onReqPkgs = setupInitArgs.onReqPkgs
          ? [...setupInitArgs.onReqPkgs, "cmake"]
          : ["cmake"];
      }

      const canAccessNinja = await utils.isBinInPath(
        "ninja",
        extensionPath,
        process.env
      );

      if (canAccessNinja === "") {
        setupInitArgs.onReqPkgs = setupInitArgs.onReqPkgs
          ? [...setupInitArgs.onReqPkgs, "ninja"]
          : ["ninja"];
      }
    } else {
      setupInitArgs.hasPrerequisites = true;
    }
    progress.report({ increment: 20, message: "Preparing setup view..." });
    if (prevInstall) {
      setupInitArgs.espIdfPath = prevInstall.espIdfPath;
      setupInitArgs.espToolsPath = prevInstall.toolsPath;
      setupInitArgs.gitPath = prevInstall.gitPath;
      setupInitArgs.gitVersion = prevInstall.gitVersion;
      if (prevInstall.existingIdfSetups) {
        for (let espIdfJsonSetup of prevInstall.existingIdfSetups) {
          const alreadyInExtensionSetup = onlyValidIdfSetups.find((s) => {
            return s.idfPath === espIdfJsonSetup.idfPath;
          });
          if (
            typeof alreadyInExtensionSetup === "undefined" &&
            espIdfJsonSetup.isValid
          ) {
            setupInitArgs.existingIdfSetups.push(espIdfJsonSetup);
          }
        }
      }
    }
  } catch (error) {
    Logger.error(error.message, error, "setupInit getSetupInitialValues");
  }
  return setupInitArgs;
}

export async function isCurrentInstallValid(workspaceFolder: Uri) {
  const containerPath =
    process.platform === "win32" ? process.env.USERPROFILE : process.env.HOME;
  

  const customExtraVars = idfConf.readParameter(
    "idf.customExtraVars",
    workspaceFolder
  ) as { [key: string]: string };
  let espIdfPath = customExtraVars["IDF_PATH"];
  const confToolsPath = customExtraVars["IDF_TOOLS_PATH"];
  const toolsPath =
    confToolsPath ||
    process.env.IDF_TOOLS_PATH ||
    path.join(containerPath, ".espressif");

  const pythonBinPath = await getVirtualEnvPythonPath(workspaceFolder);
  let idfPathVersion = await utils.getEspIdfFromCMake(espIdfPath);
  if (idfPathVersion === "x.x" && process.platform === "win32") {
    espIdfPath = path.join(process.env.USERPROFILE, "Desktop", "esp-idf");
    idfPathVersion = await utils.getEspIdfFromCMake(espIdfPath);
  }
  if (idfPathVersion === "x.x") {
    return false;
  }
  const idfToolsManager = await IdfToolsManager.createIdfToolsManager(
    espIdfPath
  );
  let extraReqPaths = [];
  if (process.platform !== "win32") {
    const canAccessCMake = await utils.isBinInPath(
      "cmake",
      containerPath,
      process.env
    );
    if (!canAccessCMake) {
      extraReqPaths.push("cmake");
    }
    const canAccessNinja = await utils.isBinInPath(
      "ninja",
      containerPath,
      process.env
    );
    if (!canAccessNinja) {
      extraReqPaths.push("ninja");
    }
  }
  const extraPaths = await idfToolsManager.exportPathsInString(
    path.join(toolsPath, "tools"),
    extraReqPaths
  );
  const toolsInfo = await idfToolsManager.getRequiredToolsInfo(
    path.join(toolsPath, "tools"),
    extraPaths,
    extraReqPaths,
    false
  );
  const failedToolsResult = toolsInfo.filter(
    (tInfo) =>
      tInfo.actual.indexOf("No match") !== -1 &&
      tInfo.actual.indexOf("Error") !== -1
  );

  if (failedToolsResult.length !== 0) {
    return false;
  }
  const isPyEnvValid = await checkPyVenv(pythonBinPath, espIdfPath);
  return isPyEnvValid;
}

export async function saveSettings(
  espIdfPath: string,
  toolsPath: string,
  gitPath: string,
  saveScope: ConfigurationTarget,
  workspaceFolderUri: Uri,
  espIdfStatusBar: StatusBarItem
) {
  const confTarget =
    saveScope ||
    (idfConf.readParameter("idf.saveScope") as ConfigurationTarget);
  let workspaceFolder: Uri;
  if (confTarget === ConfigurationTarget.WorkspaceFolder) {
    workspaceFolder = workspaceFolderUri;
  }
  await idfConf.writeParameter(
    "idf.espIdfPath",
    espIdfPath,
    confTarget,
    workspaceFolder
  );
  await idfConf.writeParameter(
    "idf.toolsPath",
    toolsPath,
    confTarget,
    workspaceFolder
  );
  await idfConf.writeParameter(
    "idf.gitPath",
    gitPath,
    ConfigurationTarget.Global
  );
  const idfVersion = await utils.getEspIdfFromCMake(espIdfPath);
  if (espIdfStatusBar) {
    const commandDictionary = createCommandDictionary();
    espIdfStatusBar.text =
      `$(${
        commandDictionary[CommandKeys.SelectCurrentIdfVersion].iconId
      }) ESP-IDF v` + idfVersion;
  }
  Logger.infoNotify("ESP-IDF has been configured");
}
