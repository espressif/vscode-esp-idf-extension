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

import { Progress } from "vscode";
import { IdfToolsManager, IEspIdfTool } from "../idfToolsManager";
import * as utils from "../utils";
import { getEspIdfVersions } from "./espIdfVersionList";
import { IEspIdfLink } from "../views/setup/types";
import { getPythonList } from "./installPyReqs";
import { pathExists } from "fs-extra";
import path from "path";
import { getPythonEnvPath } from "../pythonManager";
import { Logger } from "../logger/logger";

export interface ISetupInitArgs {
  espIdfPath: string;
  espToolsPath: string;
  exportedPaths: string;
  exportedVars: string;
  espIdfVersionsList: IEspIdfLink[];
  gitVersion: string;
  hasPrerequisites: boolean;
  pythonVersions: string[];
  toolsResults: IEspIdfTool[];
  pyBinPath: string;
}

export async function getSetupInitialValues(
  extensionPath: string,
  progress: Progress<{ message: string; increment: number }>
) {
  progress.report({ increment: 20, message: "Getting ESP-IDF versions..." });
  const espIdfVersionsList = await getEspIdfVersions(extensionPath);
  progress.report({ increment: 20, message: "Getting Python versions..." });
  const pythonVersions = await getPythonList(extensionPath);
  const gitVersion = await utils.checkGitExists(extensionPath);

  let hasPrerequisites = false;
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
    hasPrerequisites =
      gitVersion !== "" && canAccessCMake !== "" && canAccessNinja !== "";
  } else {
    hasPrerequisites = gitVersion !== "";
  }

  const setupInitArgs = {
    espIdfVersionsList,
    gitVersion,
    pythonVersions,
    hasPrerequisites,
  } as ISetupInitArgs;
  try {
    progress.report({
      increment: 10,
      message: "Checking for previous install...",
    });

    // Get initial paths
    const prevInstall = await checkPreviousInstall(pythonVersions);
    progress.report({ increment: 20, message: "Preparing setup view..." });
    if (prevInstall) {
      setupInitArgs.espIdfPath = prevInstall.espIdfPath;
      setupInitArgs.espToolsPath = prevInstall.espToolsPath;
      setupInitArgs.exportedPaths = prevInstall.exportedToolsPaths;
      setupInitArgs.exportedVars = prevInstall.exportedVars;
      setupInitArgs.toolsResults = prevInstall.toolsInfo;
      setupInitArgs.pyBinPath = prevInstall.pyVenvPath;
    }
  } catch (error) {
    Logger.error(error.message, error);
  }
  return setupInitArgs;
}

export async function checkPreviousInstall(pythonVersions: string[]) {
  const containerPath =
    process.platform === "win32" ? process.env.USERPROFILE : process.env.HOME;

  const toolsPath = path.join(containerPath, ".espressif");
  let espIdfPath = path.join(containerPath, "esp", "esp-idf");
  let idfPathVersion = await utils.getEspIdfVersion(espIdfPath);
  if (idfPathVersion !== "x.x" && process.platform === "win32") {
    espIdfPath = path.join(process.env.USERPROFILE, "Desktop", "esp-idf");
    idfPathVersion = await utils.getEspIdfVersion(espIdfPath);
  }
  if (idfPathVersion === "x.x") {
    return;
  }
  const idfToolsManager = await IdfToolsManager.createIdfToolsManager(
    espIdfPath
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
      espToolsPath: toolsPath,
    };
  }

  const exportedVars = await idfToolsManager.exportVars(
    path.join(toolsPath, "tools")
  );

  if (!exportedVars) {
    return {
      espIdfPath,
      espToolsPath: toolsPath,
      exportedToolsPaths,
      toolsInfo,
    };
  }

  const pyVenvPath = await checkPyVersion(
    pythonVersions,
    espIdfPath,
    toolsPath
  );

  if (!pyVenvPath) {
    return {
      espIdfPath,
      espToolsPath: toolsPath,
      exportedToolsPaths,
      exportedVars,
      toolsInfo,
    };
  }

  return {
    espIdfPath,
    espToolsPath: toolsPath,
    exportedToolsPaths,
    exportedVars,
    pyVenvPath,
    toolsInfo,
  };
}

export async function checkPyVersion(
  pythonVersions: string[],
  espIdfPath: string,
  toolsDir: string
) {
  for (const pyVer of pythonVersions) {
    const venvPyFolder = await getPythonEnvPath(espIdfPath, toolsDir, pyVer);
    const pythonInEnv =
      process.platform === "win32"
        ? path.join(venvPyFolder, "Scripts", "python.exe")
        : path.join(venvPyFolder, "bin", "python");
    const pyExists = await pathExists(pythonInEnv);
    if (!pyExists) {
      continue;
    }
    const requirements = path.join(espIdfPath, "requirements.txt");
    const reqsResults = await utils.startPythonReqsProcess(
      pythonInEnv,
      espIdfPath,
      requirements
    );
    if (reqsResults.indexOf("are not satisfied") > -1) {
      continue;
    }
    return pythonInEnv;
  }
  return;
}
