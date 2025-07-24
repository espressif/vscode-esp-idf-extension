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

import { Uri } from "vscode";
import { readParameter } from "../idfConfiguration";
import { Logger } from "../logger/logger";
import { delimiter, dirname, join } from "path";
import { getIdfTargetFromSdkconfig } from "../workspaceConfig";
import { ESP } from "../config";

export async function configureEnvVariables(
  curWorkspace: Uri
): Promise<{ [key: string]: string }> {
  const modifiedEnv: { [key: string]: string } = <{ [key: string]: string }>(
    Object.assign({}, process.env)
  );

  let pathNameInEnv: string = Object.keys(process.env).find(
    (k) => k.toUpperCase() == "PATH"
  );

  const currentEnvVars = ESP.ProjectConfiguration.store.get<{
    [key: string]: string;
  }>(ESP.ProjectConfiguration.CURRENT_IDF_CONFIGURATION);

  if (currentEnvVars) {
    try {
      for (const envVar in currentEnvVars) {
        if (envVar && envVar.toUpperCase() !== "PATH") {
          modifiedEnv[envVar] = currentEnvVars[envVar];
        }
      }
    } catch (error) {
      Logger.errorNotify(
        "Invalid project configuration environment variables format",
        error,
        "configureEnvVariables ProjectConfiguration.CURRENT_IDF_CONFIGURATION"
      );
    }
  }

  const customExtraVars = readParameter(
    "idf.customExtraVars",
    curWorkspace
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
        error,
        "configureEnvVariables idf.customExtraVars"
      );
    }
  }

  const containerPath =
    process.platform === "win32" ? modifiedEnv.USERPROFILE : modifiedEnv.HOME;
  const defaultEspIdfPath = join(containerPath, "esp", "esp-idf");

  modifiedEnv.IDF_PATH = modifiedEnv.IDF_PATH || defaultEspIdfPath;

  const defaultToolsPath = join(containerPath, ".espressif");
  modifiedEnv.IDF_TOOLS_PATH = modifiedEnv.IDF_TOOLS_PATH || defaultToolsPath;

  let pathToPigweed: string;

  if (modifiedEnv.ESP_MATTER_PATH) {
    pathToPigweed = join(
      modifiedEnv.ESP_MATTER_PATH,
      "connectedhomeip",
      "connectedhomeip",
      ".environment",
      "cipd",
      "packages",
      "pigweed"
    );
    modifiedEnv.ZAP_INSTALL_PATH = join(
      modifiedEnv.ESP_MATTER_PATH,
      "connectedhomeip",
      "connectedhomeip",
      ".environment",
      "cipd",
      "packages",
      "zap"
    );
  }

  const gitPath = readParameter("idf.gitPath", curWorkspace) as string;
  let pathToGitDir;
  if (gitPath && gitPath !== "git") {
    pathToGitDir = dirname(gitPath);
  }

  if (
    pathToPigweed &&
    !modifiedEnv[pathNameInEnv].split(delimiter).includes(pathToPigweed)
  ) {
    modifiedEnv[pathNameInEnv] += delimiter + pathToGitDir;
  }
  if (
    pathToPigweed &&
    !modifiedEnv[pathNameInEnv].split(delimiter).includes(pathToPigweed)
  ) {
    modifiedEnv[pathNameInEnv] += delimiter + pathToPigweed;
  }
  if (currentEnvVars["IDF_PYTHON_ENV_PATH"]) {
    const pyDir = process.platform === "win32" ? "Scripts" : "bin";
    const venvPyContainer = join(currentEnvVars["IDF_PYTHON_ENV_PATH"], pyDir);
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

  let idfTarget = await getIdfTargetFromSdkconfig(curWorkspace);
  if (idfTarget) {
    modifiedEnv.IDF_TARGET =
      modifiedEnv.IDF_TARGET || idfTarget || process.env.IDF_TARGET;
  }

  let enableComponentManager = readParameter(
    "idf.enableIdfComponentManager",
    curWorkspace
  ) as boolean;

  if (enableComponentManager) {
    modifiedEnv.IDF_COMPONENT_MANAGER = "1";
  }

  let sdkconfigFilePath = readParameter(
    "idf.sdkconfigFilePath",
    curWorkspace
  ) as string;
  if (sdkconfigFilePath) {
    modifiedEnv.SDKCONFIG = sdkconfigFilePath;
  }

  return modifiedEnv;
}
