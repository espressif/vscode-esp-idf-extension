/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 25th February 2025 2:10:52 pm
 * Copyright 2025 Espressif Systems (Shanghai) CO LTD
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

import { WorkspaceFolder } from "vscode";
import { readParameter } from "../configuration/idf";
import { Logger } from "./logger";
import { delimiter, dirname, join } from "path";
import { getIdfTargetFromSdkconfig } from "../configuration/workspace";
import { pathExists } from "fs-extra";
import { OpenOCDManager } from "../espIdf/openOcd/openOcdManager";

export async function expandEnvVariablesForIdfSetup(
  currentEnvVars: {
    [key: string]: string;
  },
  workspaceFolder: WorkspaceFolder
): Promise<{ [key: string]: string }> {
  const modifiedEnv: { [key: string]: string } = <{ [key: string]: string }>(
    Object.assign({}, process.env)
  );

  let pathNameInEnv: string =
    Object.keys(process.env).find((k) => k.toUpperCase() == "PATH") || "PATH";

  if (currentEnvVars) {
    try {
      for (const envVar in currentEnvVars) {
        if (envVar && envVar.toUpperCase() !== "PATH") {
          modifiedEnv[envVar] = currentEnvVars[envVar];
        } else if (envVar.toUpperCase() === "PATH") {
          modifiedEnv[
            pathNameInEnv
          ] = `${currentEnvVars[envVar]}${delimiter}${modifiedEnv[pathNameInEnv]}`;
        }
      }
    } catch (error) {
      Logger.errorNotify(
        "Invalid project configuration environment variables format",
        error as Error,
        "expandEnvVariablesForIdfSetup ProjectConfiguration.CURRENT_IDF_CONFIGURATION"
      );
    }
  }

  const customExtraVars = readParameter(
    "idf.customExtraVars",
    workspaceFolder
  ) as { [key: string]: string };
  if (customExtraVars) {
    try {
      for (const envVar in customExtraVars) {
        if (envVar && envVar.toUpperCase() !== "PATH") {
          modifiedEnv[envVar] = customExtraVars[envVar];
        }
      }
    } catch (error) {
      Logger.errorNotify(
        "Invalid user environment variables format",
        error as Error,
        "expandEnvVariablesForIdfSetup idf.customExtraVars"
      );
    }
  }

  try {
    const openOcdPath = await OpenOCDManager.getOpenOcdPath(
      workspaceFolder.uri,
      modifiedEnv
    );
    if (openOcdPath) {
      const openOcdDir = dirname(openOcdPath);
      const openOcdScriptsPath = join(
        openOcdDir,
        "..",
        "share",
        "openocd",
        "scripts"
      );
      const scriptsExists = await pathExists(openOcdScriptsPath);
      if (scriptsExists && modifiedEnv.OPENOCD_SCRIPTS !== openOcdScriptsPath) {
        modifiedEnv.OPENOCD_SCRIPTS = openOcdScriptsPath;
      }
    }
  } catch (error) {
    Logger.error(
      `Error processing OPENOCD_SCRIPTS path: ${
        error &&
        typeof error === "object" &&
        "message" in error &&
        typeof error.message === "string"
          ? error.message
          : "Unknown error"
      }`,
      error as Error,
      "expandEnvVariablesForIdfSetup OPENOCD_SCRIPTS"
    );
  }

  const containerPath =
    process.platform === "win32" ? modifiedEnv.USERPROFILE : modifiedEnv.HOME;
  const defaultEspIdfPath = join(containerPath, "esp", "esp-idf");

  modifiedEnv.IDF_PATH = modifiedEnv.IDF_PATH || defaultEspIdfPath;

  const defaultToolsPath = join(containerPath, ".espressif");
  modifiedEnv.IDF_TOOLS_PATH = modifiedEnv.IDF_TOOLS_PATH || defaultToolsPath;

  if (modifiedEnv["IDF_PYTHON_ENV_PATH"]) {
    const pyDir = process.platform === "win32" ? "Scripts" : "bin";
    const venvPyContainer = join(modifiedEnv["IDF_PYTHON_ENV_PATH"], pyDir);
    if (
      modifiedEnv[pathNameInEnv] &&
      !modifiedEnv[pathNameInEnv].includes(venvPyContainer)
    ) {
      modifiedEnv[pathNameInEnv] =
        venvPyContainer + delimiter + modifiedEnv[pathNameInEnv];
    }
  }
  if (
    modifiedEnv[pathNameInEnv] &&
    !modifiedEnv[pathNameInEnv].includes(join(modifiedEnv.IDF_PATH, "tools"))
  ) {
    modifiedEnv[pathNameInEnv] =
      join(modifiedEnv.IDF_PATH, "tools") +
      delimiter +
      modifiedEnv[pathNameInEnv];
  }

  if (
    currentEnvVars[pathNameInEnv] &&
    currentEnvVars[pathNameInEnv].length > 0
  ) {
    const extraPathsArray = currentEnvVars[pathNameInEnv].split(delimiter);
    for (let extraPath of extraPathsArray) {
      if (
        modifiedEnv[pathNameInEnv] &&
        !modifiedEnv[pathNameInEnv].includes(extraPath)
      ) {
        modifiedEnv[pathNameInEnv] =
          extraPath + delimiter + modifiedEnv[pathNameInEnv];
      }
    }
  }

  let IDF_ADD_PATHS_EXTRAS = join(
    modifiedEnv.IDF_PATH,
    "components",
    "espcoredump"
  );
  IDF_ADD_PATHS_EXTRAS = `${IDF_ADD_PATHS_EXTRAS}${delimiter}${join(
    modifiedEnv.IDF_PATH,
    "components",
    "partition_table"
  )}`;

  modifiedEnv[
    pathNameInEnv
  ] = `${IDF_ADD_PATHS_EXTRAS}${delimiter}${modifiedEnv[pathNameInEnv]}`;

  let idfTarget = await getIdfTargetFromSdkconfig(workspaceFolder.uri);
  if (idfTarget) {
    modifiedEnv.IDF_TARGET = idfTarget;
  }

  let enableComponentManager = readParameter(
    "idf.enableIdfComponentManager",
    workspaceFolder
  ) as boolean;

  if (enableComponentManager) {
    modifiedEnv.IDF_COMPONENT_MANAGER = "1";
  }

  let sdkconfigFilePath = readParameter(
    "idf.sdkconfigFilePath",
    workspaceFolder
  ) as string;
  if (sdkconfigFilePath) {
    modifiedEnv.SDKCONFIG = sdkconfigFilePath;
  }
  return modifiedEnv;
}
