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
import { execChildProcess, getEspIdfFromCMake, isBinInPath } from "../utils";
import { IdfToolsManager } from "../idfToolsManager";
import { join } from "path";
import { ConfigurationTarget, WorkspaceFolder } from "vscode";
import { writeParameter } from "../configuration/idf";
import { getVenvPythonBinPath } from "../configuration/env";
import { commandDictionary, CommandKeys } from "../cmdTreeView/cmdStore";
import { getEnvVariables } from "./loadSettings";
import { OutputChannel } from "../common/outputChannel";
import { statusBarItems } from "../statusBar";
import { storeIdfSetupEnvironment } from "../common/prepareEnv";
import { warnAboutStaleCustomExtraVars } from "../configuration/staleCustomExtraVars";
import { missingIdfEnvDetail } from "./setupFailureDetail";

export type SaveSettingsResult = { ok: true } | { ok: false; detail: string };

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

export function hasRequiredIdfEnv(
  envVars: { [key: string]: string } | undefined
): boolean {
  if (!envVars?.["IDF_PATH"] || !envVars["IDF_PYTHON_ENV_PATH"]) {
    return false;
  }
  return !!pathVarFromEnvVars(envVars).value;
}

const systemPathBuildTools = ["cmake", "ninja"];

export function missingToolNames(
  tools: { name: string; doesToolExist: boolean }[],
  foundOnSystemPath: string[]
): string[] {
  return tools
    .filter((tool) => {
      if (
        systemPathBuildTools.indexOf(tool.name) !== -1 &&
        foundOnSystemPath.indexOf(tool.name) !== -1
      ) {
        return false;
      }
      return !tool.doesToolExist;
    })
    .map((tool) => tool.name);
}

export async function missingRequiredToolsDetail(
  extensionPath: string,
  envVars: { [key: string]: string },
  logToChannel = false
): Promise<string | undefined> {
  const { value: pathEnvValue } = pathVarFromEnvVars(envVars);
  if (!envVars["IDF_PATH"] || !pathEnvValue) {
    return;
  }
  const foundOnSystemPath: string[] = [];
  for (const tool of systemPathBuildTools) {
    if (await isBinInPath(tool, process.env)) {
      foundOnSystemPath.push(tool);
    }
  }
  const idfToolsManager = await IdfToolsManager.createIdfToolsManager(
    extensionPath,
    envVars["IDF_PATH"]
  );
  const toolsInfo = await idfToolsManager.getRequiredToolsInfo(
    pathEnvValue,
    ["cmake", "ninja"],
    logToChannel
  );
  const missingTools = missingToolNames(toolsInfo, foundOnSystemPath);
  if (!missingTools.length) {
    return;
  }
  return `Missing required tools: ${missingTools.join(", ")}`;
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

    const { key: pathEnvKey, value: pathEnvValue } = pathVarFromEnvVars(
      envVars
    );
    if (!pathEnvValue) {
      return [false, `${pathEnvKey} is not set in environment variables`];
    }
    const missingTools = await missingRequiredToolsDetail(
      extensionPath,
      envVars,
      logToChannel
    );
    if (missingTools) {
      return [false, missingTools];
    }

    if (!envVars["IDF_PYTHON_ENV_PATH"]) {
      return [false, "IDF_PYTHON_ENV_PATH is not set in environment variables"];
    }
    const venvPythonPath = getVenvPythonBinPath(envVars["IDF_PYTHON_ENV_PATH"]);
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
): Promise<SaveSettingsResult> {
  let envVars: { [key: string]: string };
  try {
    envVars = await getEnvVariables(extensionPath, setupConf);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error loading ESP-IDF environment";
    Logger.error(
      message,
      error instanceof Error ? error : new Error(message),
      "verifySetup saveSettings",
      undefined,
      false
    );
    return { ok: false, detail: message };
  }

  if (setupConf.python) {
    envVars["PYTHON"] = setupConf.python;
  }

  if (!hasRequiredIdfEnv(envVars)) {
    const detail = missingIdfEnvDetail();
    Logger.error(
      detail,
      new Error(detail),
      "verifySetup saveSettings",
      undefined,
      false
    );
    return { ok: false, detail };
  }

  try {
    const missingTools = await missingRequiredToolsDetail(
      extensionPath,
      envVars
    );
    if (missingTools) {
      Logger.error(
        missingTools,
        new Error(missingTools),
        "verifySetup saveSettings",
        undefined,
        false
      );
      return { ok: false, detail: missingTools };
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error checking required ESP-IDF tools";
    Logger.error(
      message,
      error instanceof Error ? error : new Error(message),
      "verifySetup saveSettings",
      undefined,
      false
    );
    return { ok: false, detail: message };
  }

  await writeParameter(
    "idf.currentSetup",
    setupConf.idfPath,
    ConfigurationTarget.WorkspaceFolder,
    workspaceFolder
  );

  await storeIdfSetupEnvironment(envVars, workspaceFolder);
  void warnAboutStaleCustomExtraVars(workspaceFolder);
  if (statusBarItems["currentIdfVersion"]) {
    statusBarItems["currentIdfVersion"].text = `$(${
      commandDictionary[CommandKeys.SelectCurrentIdfVersion].iconId
    }) ESP-IDF v${setupConf.version}`;
  }
  Logger.infoNotify("ESP-IDF has been configured");
  return { ok: true };
}

export async function startPythonReqsProcess(
  pythonBinPath: string,
  espIdfPath: string,
  espIdfToolsPath: string,
  requirementsPath: string
) {
  const reqFilePath = join(espIdfPath, "tools", "check_python_dependencies.py");
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
