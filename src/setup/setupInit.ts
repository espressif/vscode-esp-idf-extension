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

import {
  ConfigurationTarget,
  Progress,
  window,
  workspace,
  WorkspaceFolder,
} from "vscode";
import { IdfToolsManager, IEspIdfTool } from "../idfToolsManager";
import * as utils from "../utils";
import { getEspIdfVersions } from "./espIdfVersionList";
import { IEspIdfLink } from "../views/setup/types";
import { getPythonList } from "./installPyReqs";
import { pathExists } from "fs-extra";
import path from "path";
import { getPythonEnvPath } from "../pythonManager";
import { Logger } from "../logger/logger";
import * as idfConf from "../idfConfiguration";
import { getPropertyFromJson, getSelectedIdfInstalled } from "./espIdfJson";

export interface ISetupInitArgs {
  espIdfPath: string;
  espIdfVersion: string;
  espToolsPath: string;
  exportedPaths: string;
  exportedVars: string;
  espIdfVersionsList: IEspIdfLink[];
  gitPath: string;
  gitVersion: string;
  hasPrerequisites: boolean;
  pythonVersions: string[];
  toolsResults: IEspIdfTool[];
  pyBinPath: string;
}

export async function checkPreviousInstall(
  pythonVersions: string[]
): Promise<ISetupInitArgs> {
  const containerPath =
    process.platform === "win32" ? process.env.USERPROFILE : process.env.HOME;

  const confEspIdfPath = idfConf.readParameter("idf.espIdfPath") as string;
  const confToolsPath = idfConf.readParameter("idf.toolsPath") as string;
  const confPyPath = idfConf.readParameter("idf.pythonBinPath") as string;
  const toolsPath =
    confToolsPath ||
    process.env.IDF_TOOLS_PATH ||
    path.join(containerPath, ".espressif");
  let espIdfPath =
    confEspIdfPath ||
    process.env.IDF_PATH ||
    path.join(containerPath, "esp", "esp-idf");
  let pyEnvPath = confPyPath || process.env.PYTHON;

  const espIdfJsonPath = path.join(toolsPath, "esp_idf.json");
  const espIdfJsonExists = await pathExists(espIdfJsonPath);
  let gitPath = idfConf.readParameter("idf.gitPath") || "/usr/bin/git";
  if (espIdfJsonExists) {
    const idfInstalled = await getSelectedIdfInstalled(toolsPath);
    if (idfInstalled && idfInstalled.path && idfInstalled.python) {
      espIdfPath = idfInstalled.path;
      pyEnvPath = idfInstalled.python;
    }
    const gitPathFromJson = (await getPropertyFromJson(
      toolsPath,
      "gitPath"
    )) as string;
    const gitPathExists = await pathExists(gitPathFromJson);
    if (gitPathExists) {
      gitPath = gitPathFromJson;
    }
  }

  const gitVersion = await utils.checkGitExists(containerPath, gitPath);

  let idfPathVersion = await utils.getEspIdfVersion(espIdfPath, gitPath);
  if (idfPathVersion === "x.x" && process.platform === "win32") {
    espIdfPath = path.join(process.env.USERPROFILE, "Desktop", "esp-idf");
    idfPathVersion = await utils.getEspIdfVersion(espIdfPath, gitPath);
  }
  if (idfPathVersion === "x.x") {
    return {
      espToolsPath: toolsPath,
      espIdfPath: undefined,
      espIdfVersion: undefined,
      exportedPaths: undefined,
      exportedVars: undefined,
      espIdfVersionsList: undefined,
      gitPath,
      gitVersion,
      hasPrerequisites: undefined,
      pythonVersions,
      toolsResults: undefined,
      pyBinPath: undefined,
    };
  }
  const idfToolsManager = await IdfToolsManager.createIdfToolsManager(
    espIdfPath,
    gitPath
  );

  const exportedToolsPaths = await idfToolsManager.exportPathsInString(
    path.join(toolsPath, "tools")
  );
  const toolsInfo = await idfToolsManager.getRequiredToolsInfo(
    path.join(toolsPath, "tools"),
    exportedToolsPaths
  );

  const failedToolsResult = toolsInfo.filter((tInfo) => !tInfo.doesToolExist);
  if (failedToolsResult.length > 0) {
    return {
      espIdfPath,
      espIdfVersion: idfPathVersion,
      espToolsPath: toolsPath,
      exportedPaths: undefined,
      exportedVars: undefined,
      espIdfVersionsList: undefined,
      gitPath,
      gitVersion,
      hasPrerequisites: undefined,
      pythonVersions,
      toolsResults: undefined,
      pyBinPath: undefined,
    };
  }

  const exportedVars = await idfToolsManager.exportVars(
    path.join(toolsPath, "tools")
  );

  if (!exportedVars) {
    return {
      espIdfPath,
      espIdfVersion: idfPathVersion,
      espToolsPath: toolsPath,
      exportedPaths: exportedToolsPaths,
      toolsResults: toolsInfo,
      exportedVars: undefined,
      espIdfVersionsList: undefined,
      gitPath,
      gitVersion,
      hasPrerequisites: undefined,
      pythonVersions,
      pyBinPath: undefined,
    };
  }

  let isPyEnvValid = await checkPyVenv(pyEnvPath, espIdfPath);
  if (!isPyEnvValid) {
    pyEnvPath = await checkPyVersion(
      pythonVersions,
      espIdfPath,
      toolsPath,
      gitPath
    );
  }

  if (!pyEnvPath) {
    return {
      espIdfPath,
      espIdfVersion: idfPathVersion,
      espToolsPath: toolsPath,
      exportedPaths: exportedToolsPaths,
      exportedVars,
      toolsResults: toolsInfo,
      espIdfVersionsList: undefined,
      gitPath,
      gitVersion,
      hasPrerequisites: undefined,
      pythonVersions,
      pyBinPath: undefined,
    };
  }

  return {
    espIdfPath,
    espIdfVersion: idfPathVersion,
    espToolsPath: toolsPath,
    exportedPaths: exportedToolsPaths,
    exportedVars,
    pyBinPath: pyEnvPath,
    toolsResults: toolsInfo,
    espIdfVersionsList: undefined,
    gitPath,
    gitVersion,
    hasPrerequisites: undefined,
    pythonVersions,
  };
}

export async function checkPyVersion(
  pythonVersions: string[],
  espIdfPath: string,
  toolsDir: string,
  gitPath: string
) {
  for (const pyVer of pythonVersions) {
    const pyExists = await pathExists(pyVer);
    if (!pyExists) {
      continue;
    }
    const venvPyFolder = await getPythonEnvPath(
      espIdfPath,
      toolsDir,
      pyVer,
      gitPath
    );
    const pythonInEnv =
      process.platform === "win32"
        ? path.join(venvPyFolder, "Scripts", "python.exe")
        : path.join(venvPyFolder, "bin", "python");
    const isVenvValid = await checkPyVenv(pythonInEnv, espIdfPath);
    if (isVenvValid) {
      return pythonInEnv;
    }
  }
  return;
}

export async function checkPyVenv(pyVenvPath: string, espIdfPath: string) {
  const pyExists = await pathExists(pyVenvPath);
  if (!pyExists) {
    return false;
  }
  const requirements = path.join(espIdfPath, "requirements.txt");
  const reqsResults = await utils.startPythonReqsProcess(
    pyVenvPath,
    espIdfPath,
    requirements
  );
  if (reqsResults.indexOf("are not satisfied") > -1) {
    return false;
  }
  return true;
}

export async function getSetupInitialValues(
  extensionPath: string,
  progress: Progress<{ message: string; increment: number }>
) {
  progress.report({ increment: 20, message: "Getting ESP-IDF versions..." });
  const espIdfVersionsList = await getEspIdfVersions(extensionPath);
  progress.report({ increment: 20, message: "Getting Python versions..." });
  const pythonVersions = await getPythonList(extensionPath);
  const setupInitArgs = {
    espIdfVersionsList,
    pythonVersions,
  } as ISetupInitArgs;
  try {
    progress.report({
      increment: 10,
      message: "Checking for previous install...",
    });

    // Get initial paths
    const prevInstall = await checkPreviousInstall(pythonVersions);
    if (process.platform !== "win32") {
      const canAccessCMake = await utils.isBinInPath(
        "cmake",
        extensionPath,
        process.env
      );
      const canAccessNinja = await utils.isBinInPath(
        "ninja",
        extensionPath,
        process.env
      );
      setupInitArgs.hasPrerequisites =
        prevInstall.gitVersion !== "Not found" &&
        canAccessCMake !== "" &&
        canAccessNinja !== "" &&
        pythonVersions &&
        pythonVersions.length > 0;
    } else {
      setupInitArgs.hasPrerequisites = prevInstall.gitVersion !== "Not found";
    }
    progress.report({ increment: 20, message: "Preparing setup view..." });
    if (prevInstall) {
      setupInitArgs.espIdfPath = prevInstall.espIdfPath;
      setupInitArgs.espIdfVersion = prevInstall.espIdfVersion;
      setupInitArgs.espToolsPath = prevInstall.espToolsPath;
      setupInitArgs.exportedPaths = prevInstall.exportedPaths;
      setupInitArgs.exportedVars = prevInstall.exportedVars;
      setupInitArgs.gitPath = prevInstall.gitPath;
      setupInitArgs.gitVersion = prevInstall.gitVersion;
      setupInitArgs.toolsResults = prevInstall.toolsResults;
      setupInitArgs.pyBinPath = prevInstall.pyBinPath;
    }
  } catch (error) {
    Logger.error(error.message, error);
  }
  return setupInitArgs;
}

export async function isCurrentInstallValid() {
  const containerPath =
    process.platform === "win32" ? process.env.USERPROFILE : process.env.HOME;
  const confToolsPath = idfConf.readParameter("idf.toolsPath") as string;
  const toolsPath =
    confToolsPath ||
    process.env.IDF_TOOLS_PATH ||
    path.join(containerPath, ".espressif");
  const extraPaths = idfConf.readParameter("idf.customExtraPaths") as string;
  let espIdfPath = idfConf.readParameter("idf.espIdfPath");
  const gitPath = idfConf.readParameter("idf.gitPath") || "git";
  let idfPathVersion = await utils.getEspIdfVersion(espIdfPath, gitPath);
  if (idfPathVersion === "x.x" && process.platform === "win32") {
    espIdfPath = path.join(process.env.USERPROFILE, "Desktop", "esp-idf");
    idfPathVersion = await utils.getEspIdfVersion(espIdfPath, gitPath);
  }
  if (idfPathVersion === "x.x") {
    return false;
  }
  const idfToolsManager = await IdfToolsManager.createIdfToolsManager(
    espIdfPath,
    gitPath
  );
  const toolsInfo = await idfToolsManager.getRequiredToolsInfo(
    path.join(toolsPath, "tools"),
    extraPaths
  );
  const failedToolsResult = toolsInfo.filter(
    (tInfo) =>
      tInfo.actual.indexOf("No match") !== -1 ||
      tInfo.actual.indexOf("Error") !== -1
  );
  return failedToolsResult.length === 0;
}

export async function saveSettings(
  espIdfPath: string,
  pythonBinPath: string,
  exportedPaths: string,
  exportedVars: string,
  toolsPath: string,
  gitPath: string
) {
  const confTarget = idfConf.readParameter(
    "idf.saveScope"
  ) as ConfigurationTarget;
  let workspaceFolder: WorkspaceFolder;
  if (confTarget === ConfigurationTarget.WorkspaceFolder) {
    workspaceFolder = await window.showWorkspaceFolderPick({
      placeHolder: `Pick Workspace Folder to which settings should be applied`,
    });
  }
  await idfConf.writeParameter(
    "idf.espIdfPath",
    espIdfPath,
    confTarget,
    workspaceFolder ? workspaceFolder.uri : undefined
  );
  await idfConf.writeParameter(
    "idf.pythonBinPath",
    pythonBinPath,
    confTarget,
    workspaceFolder ? workspaceFolder.uri : undefined
  );
  await idfConf.writeParameter(
    "idf.toolsPath",
    toolsPath,
    confTarget,
    workspaceFolder ? workspaceFolder.uri : undefined
  );
  await idfConf.writeParameter(
    "idf.customExtraPaths",
    exportedPaths,
    confTarget,
    workspaceFolder ? workspaceFolder.uri : undefined
  );
  await idfConf.writeParameter(
    "idf.customExtraVars",
    exportedVars,
    confTarget,
    workspaceFolder ? workspaceFolder.uri : undefined
  );
  await idfConf.writeParameter(
    "idf.gitPath",
    gitPath,
    confTarget,
    workspaceFolder ? workspaceFolder.uri : undefined
  );
  window.showInformationMessage("ESP-IDF has been configured");
}
