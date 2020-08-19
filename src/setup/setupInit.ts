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
import { IdfToolsManager, IToolInfo } from "../idfToolsManager";
import { OutputChannel } from "../logger/outputChannel";
import { PlatformInformation } from "../PlatformInformation";
import * as utils from "../utils";
import { getEspIdfVersions, IEspIdfLink } from "./espIdfVersionList";
import { getPythonList } from "./installPyReqs";
import { readJSON, pathExists } from "fs-extra";
import path from "path";
import { getPythonEnvPath } from "../pythonManager";
import { Logger } from "../logger/logger";

export interface ISetupInitArgs {
  espIdfPath: string;
  exportedPaths: string;
  exportedVars: string;
  espIdfVersionsList: IEspIdfLink[];
  gitVersion: string;
  pythonVersions: string[];
  toolsResults: IToolInfo[];
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
  const setupInitArgs = {
    espIdfVersionsList,
    gitVersion,
    pythonVersions,
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
      setupInitArgs.exportedPaths = prevInstall.exportedToolsPaths;
      setupInitArgs.exportedVars = prevInstall.exportedVars;
      setupInitArgs.toolsResults = prevInstall.toolsInfo;
      setupInitArgs.pyBinPath = prevInstall.pyVenvPath;
    }
    console.log(setupInitArgs);
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

  const platformInfo = await PlatformInformation.GetPlatformInformation();
  const toolsJsonPath = await utils.getToolsJsonPath(espIdfPath);
  const toolsJson = await readJSON(toolsJsonPath);

  const idfToolsManager = new IdfToolsManager(
    toolsJson,
    platformInfo,
    OutputChannel.init()
  );

  const exportedToolsPaths = await idfToolsManager.exportPaths(
    path.join(toolsPath, "tools")
  );
  const toolsResults = await idfToolsManager.verifyPackages(exportedToolsPaths);
  const toolsInfo = await idfToolsManager.checkToolsVersion(exportedToolsPaths);

  const toolsResult = toolsInfo.filter((tInfo) => !tInfo.doesToolExist);
  if (toolsResult.length > 0) {
    return;
  }

  const exportedVars = await idfToolsManager.exportVars(
    path.join(toolsPath, "tools")
  );

  if (!exportedVars) {
    return;
  }

  const pyVenvPath = await checkPyVersion(
    pythonVersions,
    espIdfPath,
    toolsPath
  );

  if (!pyVenvPath) {
    return;
  }

  return {
    espIdfPath,
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
