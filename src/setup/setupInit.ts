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
  Uri,
  window,
  WorkspaceFolder,
} from "vscode";
import { IdfToolsManager, IEspIdfTool } from "../idfToolsManager";
import * as utils from "../utils";
import { getEspIdfTags, getEspIdfVersions } from "./espIdfVersionList";
import { IdfSetup, IEspIdfLink } from "../views/setup/types";
import { getPythonList } from "./installPyReqs";
import { pathExists } from "fs-extra";
import path from "path";
import { getPythonEnvPath } from "../pythonManager";
import { Logger } from "../logger/logger";
import * as idfConf from "../idfConfiguration";
import {
  getPropertyFromJson,
  getSelectedIdfInstalled,
  loadEspIdfJson,
} from "./espIdfJson";
import { ESP } from "../config";
import { createIdfSetup, getPreviousIdfSetups } from "./existingIdfSetups";

export interface ISetupInitArgs {
  espIdfPath: string;
  espIdfVersion: string;
  espToolsPath: string;
  existingIdfSetups: IdfSetup[];
  exportedPaths: string;
  exportedVars: { [key: string]: string };
  espIdfVersionsList: IEspIdfLink[];
  espIdfTagsList: IEspIdfLink[];
  gitPath: string;
  gitVersion: string;
  hasPrerequisites: boolean;
  onReqPkgs?: string[];
  pythonVersions: string[];
  toolsResults: IEspIdfTool[];
  pyBinPath: string;
}

export async function checkPreviousInstall(
  pythonVersions: string[],
  workspaceFolder: Uri
): Promise<ISetupInitArgs> {
  const containerPath =
    process.platform === "win32" ? process.env.USERPROFILE : process.env.HOME;

  const confEspIdfPath = idfConf.readParameter(
    "idf.espIdfPath",
    workspaceFolder
  ) as string;
  const confToolsPath = idfConf.readParameter(
    "idf.toolsPath",
    workspaceFolder
  ) as string;
  const confPyPath = idfConf.readParameter(
    "idf.pythonBinPath",
    workspaceFolder
  ) as string;
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
  let gitPath =
    idfConf.readParameter("idf.gitPath", workspaceFolder) || "/usr/bin/git";
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
      espIdfVersionsList: undefined,
      espIdfTagsList: undefined,
      existingIdfSetups: undefined,
      exportedPaths: undefined,
      exportedVars: undefined,
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
    path.join(toolsPath, "tools"),
    ["cmake", "ninja"]
  );
  const toolsInfo = await idfToolsManager.getRequiredToolsInfo(
    path.join(toolsPath, "tools"),
    exportedToolsPaths,
    ["cmake", "ninja"]
  );

  const failedToolsResult = toolsInfo.filter(
    (tInfo) =>
      !tInfo.doesToolExist && ["cmake", "ninja"].indexOf(tInfo.name) === -1
  );
  if (failedToolsResult.length > 0) {
    return {
      espIdfPath,
      espIdfVersion: idfPathVersion,
      espToolsPath: toolsPath,
      exportedPaths: undefined,
      exportedVars: undefined,
      espIdfVersionsList: undefined,
      espIdfTagsList: undefined,
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
      espIdfTagsList: undefined,
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
      espIdfTagsList: undefined,
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
    espIdfTagsList: undefined,
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
  let requirements: string;
  requirements = path.join(
    espIdfPath,
    "tools",
    "requirements",
    "requirements.core.txt"
  );
  const coreRequirementsExists = await pathExists(requirements);
  if (!coreRequirementsExists) {
    requirements = path.join(espIdfPath, "requirements.txt");
    const requirementsExists = await pathExists(requirements);
    if (!requirementsExists) {
      return false;
    }
  }
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
  progress: Progress<{ message: string; increment: number }>,
  workspaceFolder: Uri
) {
  progress.report({ increment: 20, message: "Getting ESP-IDF versions..." });
  const espIdfVersionsList = await getEspIdfVersions(extensionPath);
  progress.report({ increment: 10, message: "Getting ESP-IDF Tags" });
  const espIdfTagsList = await getEspIdfTags();
  progress.report({ increment: 10, message: "Getting Python versions..." });
  const pythonVersions = await getPythonList(extensionPath);
  const idfSetups = getPreviousIdfSetups();
  const setupInitArgs = {
    espIdfVersionsList,
    espIdfTagsList,
    existingIdfSetups: idfSetups,
    pythonVersions,
  } as ISetupInitArgs;

  try {
    progress.report({
      increment: 10,
      message: "Checking for previous install...",
    });

    // Get initial paths
    const prevInstall = await checkPreviousInstall(
      pythonVersions,
      workspaceFolder
    );
    if (process.platform !== "win32") {
      setupInitArgs.hasPrerequisites =
        prevInstall.gitVersion !== "Not found" &&
        pythonVersions &&
        pythonVersions.length > 0;

      const cmakeFromToolsIndex = getToolIndex(
        "cmake",
        prevInstall.toolsResults
      );

      const canAccessCMake = await utils.isBinInPath(
        "cmake",
        extensionPath,
        process.env
      );

      if (cmakeFromToolsIndex !== -1) {
        prevInstall.toolsResults.splice(cmakeFromToolsIndex, 1);
      } else if (canAccessCMake === "") {
        setupInitArgs.onReqPkgs = setupInitArgs.onReqPkgs
          ? [...setupInitArgs.onReqPkgs, "cmake"]
          : ["cmake"];
      }

      const ninjaFromToolsIndex = getToolIndex(
        "ninja",
        prevInstall.toolsResults
      );

      const canAccessNinja = await utils.isBinInPath(
        "ninja",
        extensionPath,
        process.env
      );

      if (ninjaFromToolsIndex !== -1) {
        prevInstall.toolsResults.splice(ninjaFromToolsIndex, 1);
      } else if (canAccessNinja === "") {
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

function getToolIndex(toolName: string, toolsResults: IEspIdfTool[]) {
  return toolsResults && toolsResults.length
    ? toolsResults.findIndex(
        (t) =>
          t.name.indexOf(toolName) !== -1 &&
          t.actual.indexOf("No match") === -1 &&
          t.actual.indexOf("Error") === -1
      )
    : -1;
}

function updateCustomExtraVars(workspaceFolder: Uri) {
  const extraVars = idfConf.readParameter(
    "idf.customExtraVars",
    workspaceFolder
  );
  if (typeof extraVars === "string") {
    try {
      const extraVarsObj = JSON.parse(extraVars);
      const target = idfConf.readParameter("idf.saveScope");
      idfConf.writeParameter(
        "idf.customExtraVars",
        extraVarsObj,
        target,
        workspaceFolder
      );
    } catch (err) {
      const msg = err.message
        ? err.message
        : "Error changing idf.customExtraVars from string to object";
      Logger.errorNotify(msg, err);
    }
  }
}

export async function isCurrentInstallValid(workspaceFolder: Uri) {
  const containerPath =
    process.platform === "win32" ? process.env.USERPROFILE : process.env.HOME;
  const confToolsPath = idfConf.readParameter(
    "idf.toolsPath",
    workspaceFolder
  ) as string;
  const toolsPath =
    confToolsPath ||
    process.env.IDF_TOOLS_PATH ||
    path.join(containerPath, ".espressif");
  const extraPaths = idfConf.readParameter(
    "idf.customExtraPaths",
    workspaceFolder
  ) as string;

  // FIX idf.customExtraVars from string to object
  // REMOVE THIS LINE after next release
  updateCustomExtraVars(workspaceFolder);

  let espIdfPath = idfConf.readParameter("idf.espIdfPath", workspaceFolder);
  const gitPath =
    idfConf.readParameter("idf.gitPath", workspaceFolder) || "git";
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
  const toolsInfo = await idfToolsManager.getRequiredToolsInfo(
    path.join(toolsPath, "tools"),
    extraPaths,
    extraReqPaths
  );
  const failedToolsResult = toolsInfo.filter(
    (tInfo) =>
      tInfo.actual.indexOf("No match") !== -1 &&
      tInfo.actual.indexOf("Error") !== -1
  );
  return failedToolsResult.length === 0;
}

export async function saveSettings(
  espIdfPath: string,
  pythonBinPath: string,
  exportedPaths: string,
  exportedVars: { [key: string]: string },
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
  await createIdfSetup(espIdfPath, toolsPath, pythonBinPath);
  window.showInformationMessage("ESP-IDF has been configured");
}
