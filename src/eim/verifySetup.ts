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
import { Logger } from "../common/logger";
import { IdfSetup } from "./types";
import { execChildProcess, getEspIdfFromCMake } from "../utils";
import { IdfToolsManager, IEspIdfTool } from "../idfToolsManager";
import { join } from "path";
import { ConfigurationTarget, WorkspaceFolder } from "vscode";
import { writeParameter } from "../configuration/idf";
import { commandDictionary, CommandKeys } from "../cmdTreeView/cmdStore";
import { getEnvVariables } from "./loadSettings";
import { ESP } from "../config";
import { OutputChannel } from "../common/outputChannel";
import { statusBarItems } from "../statusBar";
import { expandEnvVariablesForIdfSetup } from "../common/prepareEnv";

export function pathVarFromEnvVars(envVars: {
  [key: string]: string;
}): {
  key: string;
  value: string | undefined;
} {
  const key = Object.keys(envVars).find((k) => k.toUpperCase() === "PATH");
  if (key !== undefined) {
    return { key, value: envVars[key] };
  }
  return { key: "PATH", value: undefined };
}

/**
 * Validate that given IDF Setup is valid.
 * @param {[key: string]: string} envVars Environment variables to validate IDF Setup against.
 * @param logToChannel If output IDF Tools validation result in output channel
 * @returns {[boolean, string]} Tuple: True if IDF Setup is valid, False otherwise, and fail reason
 */
export async function isIdfSetupValid(
  extensionPath: string,
  envVars: { [key: string]: string },
  logToChannel = true
): Promise<[boolean, string]> {
  try {
    if (!envVars["IDF_PATH"]) {
      return [false, "IDF_PATH is not set in environment variables"];
    }
    const doesIdfPathExists = await pathExists(envVars["IDF_PATH"]);
    if (!doesIdfPathExists) {
      return [false, `IDF_PATH does not exist: ${envVars["IDF_PATH"]}`];
    }

    const idfToolsManager = await IdfToolsManager.createIdfToolsManager(
      extensionPath,
      envVars["IDF_PATH"]
    );

    const { key: pathEnvKey, value: pathEnvValue } = pathVarFromEnvVars(
      envVars
    );
    if (!pathEnvValue) {
      return [false, `${pathEnvKey} is not set in environment variables`];
    }
    let toolsInfo: IEspIdfTool[] = await idfToolsManager.getRequiredToolsInfo(
      pathEnvValue,
      ["cmake", "ninja"],
      logToChannel
    );

    const failedToolsResult = toolsInfo.filter(
      (tInfo) =>
        !tInfo.doesToolExist && ["cmake", "ninja"].indexOf(tInfo.name) === -1
    );

    if (failedToolsResult.length) {
      const missingTools = failedToolsResult.map((t) => t.name).join(", ");
      return [false, `Missing required tools: ${missingTools}`];
    }

    if (!envVars["IDF_PYTHON_ENV_PATH"]) {
      return [false, "IDF_PYTHON_ENV_PATH is not set in environment variables"];
    }
    const pyDir =
      process.platform === "win32"
        ? ["Scripts", "python.exe"]
        : ["bin", "python3"];
    const venvPythonPath = join(envVars["IDF_PYTHON_ENV_PATH"], ...pyDir);
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
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string"
        ? error.message
        : `Error checking ESP-IDF setup validity.`;
    Logger.error(msg, error as Error, "verifySetup isIdfSetupValid");
    return [false, msg];
  }
}

export async function checkPyVenv(
  pyVenvPath: string,
  espIdfPath: string,
  espIdfToolsPath: string
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
  extensionPath: string,
  setupConf: IdfSetup,
  workspaceFolder: WorkspaceFolder
) {
  await writeParameter(
    "idf.currentSetup",
    setupConf.idfPath,
    ConfigurationTarget.WorkspaceFolder,
    workspaceFolder
  );

  const envVars = await getEnvVariables(extensionPath, setupConf);

  if (setupConf.python) {
    envVars["PYTHON"] = setupConf.python;
  }

  const expandedEnvVars = await expandEnvVariablesForIdfSetup(
    envVars,
    workspaceFolder
  );

  ESP.ProjectConfiguration.store.set(
    ESP.ProjectConfiguration.CURRENT_IDF_CONFIGURATION,
    expandedEnvVars,
  );
  if (statusBarItems["currentIdfVersion"]) {
    statusBarItems["currentIdfVersion"].text = `$(${
      commandDictionary[CommandKeys.SelectCurrentIdfVersion].iconId
    }) ESP-IDF v${setupConf.version}`;
  }
  Logger.infoNotify("ESP-IDF has been configured");
}

export async function startPythonReqsProcess(
  pythonBinPath: string,
  espIdfPath: string,
  espIdfToolsPath: string,
  requirementsPath: string
) {
  const reqFilePath = join(
    espIdfPath,
    "tools",
    "check_python_dependencies.py"
  );
  const modifiedEnv: { [key: string]: string } = <{ [key: string]: string }>(
    Object.assign({}, process.env)
  );
  modifiedEnv.IDF_PATH = espIdfPath;
  const fullEspIdfVersion = await getEspIdfFromCMake(espIdfPath);
  const majorMinorMatches = fullEspIdfVersion.match(/([0-9]+\.[0-9]+).*/);
  const espIdfVersion =
    majorMinorMatches && majorMinorMatches.length > 0
      ? majorMinorMatches[1]
      : "x.x";
  const constrainsFile = join(
    espIdfToolsPath,
    `espidf.constraints.v${espIdfVersion}.txt`
  );
  const constrainsFileExists = await pathExists(constrainsFile);
  let checkPyArgs = [reqFilePath, "-r", requirementsPath];
  if (constrainsFileExists) {
    checkPyArgs = checkPyArgs.concat(["--constraint", constrainsFile]);
  }
  return execChildProcess(
    pythonBinPath,
    checkPyArgs,
    espIdfPath,
    OutputChannel.init(),
    { env: modifiedEnv, cwd: espIdfPath }
  );
}
