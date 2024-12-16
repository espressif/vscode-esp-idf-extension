/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 11th December 2024 3:05:43 pm
 * Copyright 2024 Espressif Systems (Shanghai) CO LTD
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

import { pathExists } from "fs-extra";
import { Logger } from "../logger/logger";
import { IdfSetup } from "./types";
import { execChildProcess, startPythonReqsProcess } from "../utils";
import { OutputChannel } from "../logger/outputChannel";
import { EOL } from "os";
import { IdfToolsManager } from "../idfToolsManager";
import { join } from "path";
import { ConfigurationTarget, StatusBarItem, Uri } from "vscode";
import { readParameter, writeParameter } from "../idfConfiguration";
import { CommandKeys, createCommandDictionary } from "../cmdTreeView/cmdStore";

export async function getEnvVariables(
  activationScriptPath: string,
  logToChannel = false
) {
  try {
    const args =
      process.platform === "win32"
        ? [
            "-ExecutionPolicy",
            "Bypass",
            "-NoProfile",
            activationScriptPath,
            "-e",
          ]
        : [activationScriptPath, "-e"];
    const shellPath =
      process.platform === "win32"
        ? "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"
        : "/bin/sh";
    const envVarsOutput = await execChildProcess(
      shellPath,
      args,
      process.cwd(),
      logToChannel ? OutputChannel.init() : undefined,
      {
        maxBuffer: 500 * 1024,
        cwd: process.cwd(),
      }
    );
    const envVars = envVarsOutput.split(EOL);
    let envDict: { [key: string]: string } = {};
    for (const envVar of envVars) {
      let keyIndex = envVar.indexOf("=");
      if (keyIndex === -1) {
        continue;
      }
      let varKey = envVar.slice(0, keyIndex);
      let varValue = envVar.slice(keyIndex + 1);
      envDict[varKey] = varValue;
    }
    return envDict;
  } catch (error) {
    const errMsg =
      error && error.message
        ? error.message
        : "Error getting Env variables from EIM activation script";
    Logger.error(
      errMsg,
      error,
      "verifySetup getEnvVariables",
      undefined,
      false
    );
  }
}

export async function checkIdfSetup(activationScript: string, logToChannel = true) {
  try {
    // TODO Get PATH from activation script
    let envVars = await getEnvVariables(
      activationScript,
      logToChannel
    );
    const pyDir = process.platform === "win32"
      ? ["Scripts", "python.exe"]
      : ["bin", "python"];
    const venvPythonPath = join(envVars["IDF_PYTHON_ENV_PATH"], ...pyDir);

    if (!envVars["IDF_PATH"]) {
      return false;
    }
    const doesIdfPathExists = await pathExists(envVars["IDF_PATH"]);
    if (!doesIdfPathExists) {
      return false;
    }
    
    const pathNameInEnv: string = Object.keys(envVars).find(
      (k) => k.toUpperCase() == "PATH"
    );

    const idfToolsManager = await IdfToolsManager.createIdfToolsManager(
      envVars["IDF_PATH"]
    );

    const toolsInfo = await idfToolsManager.getEIMToolsInfo(
      envVars[pathNameInEnv],
      ["cmake", "ninja"],
      logToChannel
    );

    const failedToolsResult = toolsInfo.filter(
      (tInfo) =>
        !tInfo.doesToolExist && ["cmake", "ninja"].indexOf(tInfo.name) === -1
    );

    if (failedToolsResult.length) {
      return false;
    }
    const pyEnvReqs = await checkPyVenv(
      venvPythonPath,
      envVars["IDF_PATH"]
    );
    return pyEnvReqs;
  } catch (error) {
    const msg =
      error && error.message
        ? error.message
        : `Error checking EIM Idf Setup for script ${activationScript}`;
    Logger.error(msg, error, "verifySetup checkIdfSetup");
    return false;
  }
}

export async function checkPyVenv(pyVenvPath: string, espIdfPath: string) {
  const pyExists = await pathExists(pyVenvPath);
  if (!pyExists) {
    return false;
  }
  let requirements: string;
  requirements = join(
    espIdfPath,
    "tools",
    "requirements",
    "requirements.core.txt"
  );
  const coreRequirementsExists = await pathExists(requirements);
  if (!coreRequirementsExists) {
    requirements = join(espIdfPath, "requirements.txt");
    const requirementsExists = await pathExists(requirements);
    if (!requirementsExists) {
      return false;
    }
  }
  const reqsResults = await startPythonReqsProcess(
    pyVenvPath,
    espIdfPath,
    requirements
  );
  if (reqsResults.indexOf("are not satisfied") > -1) {
    return false;
  }
  return true;
}

export async function saveSettings(
  setupConf: IdfSetup,
  saveScope: ConfigurationTarget,
  workspaceFolderUri: Uri,
  espIdfStatusBar: StatusBarItem
) {
  const confTarget =
    saveScope || (readParameter("idf.saveScope") as ConfigurationTarget);
  let workspaceFolder: Uri;
  if (confTarget === ConfigurationTarget.WorkspaceFolder) {
    workspaceFolder = workspaceFolderUri;
  }

  const customExtraVars = readParameter(
    "idf.customExtraVars",
    workspaceFolder
  ) as { [key: string]: string };

  const idfEnvVars = await getEnvVariables(setupConf.activationScript, true);
  for (const envVar in idfEnvVars) {
    customExtraVars[envVar] = idfEnvVars[envVar];
  }
  await writeParameter(
    "idf.customExtraVars",
    customExtraVars,
    confTarget,
    workspaceFolder
  );
  await writeParameter(
    "idf.espIdfPath",
    setupConf.idfPath,
    confTarget,
    workspaceFolder
  );
  await writeParameter(
    "idf.toolsPath",
    setupConf.toolsPath,
    confTarget,
    workspaceFolder
  );
  await writeParameter(
    "idf.gitPath",
    setupConf.gitPath,
    ConfigurationTarget.Global
  );
  if (espIdfStatusBar) {
    const commandDictionary = createCommandDictionary();
    espIdfStatusBar.text =
      `$(${
        commandDictionary[CommandKeys.SelectCurrentIdfVersion].iconId
      }) ESP-IDF ${setupConf.version}` + setupConf.version;
  }
  Logger.infoNotify("ESP-IDF has been configured");
}

export async function loadEnvSetup() {}
