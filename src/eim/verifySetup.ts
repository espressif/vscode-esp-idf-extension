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
import { startPythonReqsProcess } from "../utils";
import { IdfToolsManager, IEspIdfTool } from "../idfToolsManager";
import { join } from "path";
import { ConfigurationTarget, StatusBarItem, Uri } from "vscode";
import { writeParameter } from "../idfConfiguration";
import { CommandKeys, createCommandDictionary } from "../cmdTreeView/cmdStore";
import { getEnvVariables } from "./loadSettings";
import { ESP } from "../config";

/**
 * Validate that given IDF Setup is valid.
 * @param {IdfSetup} idfSetup IDF Setup to validate.
 * @param logToChannel If output IDF Tools validation result in output channel
 * @returns {[boolean, string]} Tuple: True if IDF Setup is valid, False otherwise, and fail reason
 */
export async function isIdfSetupValid(
  idfSetup: IdfSetup,
  logToChannel = true
): Promise<[boolean, string]> {
  try {
    let envVars: { [key: string]: string } = await getEnvVariables(idfSetup);
    let venvPythonPath: string = "";
    if (idfSetup.python) {
      venvPythonPath = idfSetup.python;
    } else {
      const pyDir =
        process.platform === "win32"
          ? ["Scripts", "python.exe"]
          : ["bin", "python3"];
      venvPythonPath = join(envVars["IDF_PYTHON_ENV_PATH"], ...pyDir);
    }

    if (!envVars["IDF_PATH"]) {
      return [false, "IDF_PATH is not set in environment variables"];
    }
    const doesIdfPathExists = await pathExists(envVars["IDF_PATH"]);
    if (!doesIdfPathExists) {
      return [false, `IDF_PATH does not exist: ${envVars["IDF_PATH"]}`];
    }

    const pathNameInEnv: string = Object.keys(envVars).find(
      (k) => k.toUpperCase() == "PATH"
    );

    const idfToolsManager = await IdfToolsManager.createIdfToolsManager(
      envVars["IDF_PATH"]
    );
    let toolsInfo: IEspIdfTool[] = [];
    const activationScriptPathExists = await pathExists(
      idfSetup.activationScript
    );
    if (!activationScriptPathExists) {
      const exportedToolsPaths = await idfToolsManager.exportPathsInString(
        join(idfSetup.toolsPath, "tools"),
        ["cmake", "ninja"]
      );
      toolsInfo = await idfToolsManager.getRequiredToolsInfo(
        join(idfSetup.toolsPath, "tools"),
        exportedToolsPaths,
        ["cmake", "ninja"],
        logToChannel
      );
    } else {
      toolsInfo = await idfToolsManager.getEIMToolsInfo(
        envVars[pathNameInEnv],
        ["cmake", "ninja"],
        logToChannel
      );
    }

    const failedToolsResult = toolsInfo.filter(
      (tInfo) =>
        !tInfo.doesToolExist && ["cmake", "ninja"].indexOf(tInfo.name) === -1
    );

    if (failedToolsResult.length) {
      const missingTools = failedToolsResult.map((t) => t.name).join(", ");
      return [false, `Missing required tools: ${missingTools}`];
    }
    const [pyEnvReqsValid, pyEnvReqsMsg] = await checkPyVenv(
      venvPythonPath,
      envVars["IDF_PATH"],
      envVars["IDF_TOOLS_PATH"]
    );
    if (!pyEnvReqsValid) {
      return [
        pyEnvReqsValid,
        pyEnvReqsMsg ||
          "Python virtual environment or requirements are not satisfied",
      ];
    }
    return [true, ""];
  } catch (error) {
    const msg =
      error && error.message
        ? error.message
        : `Error checking EIM Idf Setup for script ${idfSetup.activationScript}`;
    Logger.error(msg, error, "verifySetup isIdfSetupValid");
    return [false, msg];
  }
}

export async function checkPyVenv(
  pyVenvPath: string,
  espIdfPath: string,
  espIdfToolsPath: string,
): Promise<[boolean, string]> {
  const pyExists = await pathExists(pyVenvPath);
  if (!pyExists) {
    return [false, `${pyVenvPath} does not exist.`];
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
      return [false, `${requirements} doesn't exist.`];
    }
  }
  const reqsResults = await startPythonReqsProcess(
    pyVenvPath,
    espIdfPath,
    espIdfToolsPath,
    requirements
  );
  if (reqsResults.indexOf("are not satisfied") > -1) {
    return [false, reqsResults];
  }
  return [true, ""];
}

export async function saveSettings(
  setupConf: IdfSetup,
  workspaceFolderUri: Uri,
  espIdfStatusBar: StatusBarItem
) {
  await writeParameter(
    "idf.currentSetup",
    setupConf.idfPath,
    ConfigurationTarget.WorkspaceFolder,
    workspaceFolderUri
  );

  const envVars = await getEnvVariables(setupConf);

  if (setupConf.python) {
    envVars["PYTHON"] = setupConf.python;
  }

  ESP.ProjectConfiguration.store.set(
    ESP.ProjectConfiguration.CURRENT_IDF_CONFIGURATION,
    envVars
  );
  await writeParameter(
    "idf.gitPath",
    setupConf.gitPath,
    ConfigurationTarget.Global
  );
  if (espIdfStatusBar) {
    const commandDictionary = createCommandDictionary();
    espIdfStatusBar.text = `$(${
      commandDictionary[CommandKeys.SelectCurrentIdfVersion].iconId
    }) ESP-IDF v${setupConf.version}`;
  }
  Logger.infoNotify("ESP-IDF has been configured");
}
