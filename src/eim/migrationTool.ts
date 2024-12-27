/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 16th December 2024 5:48:20 pm
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

import { ConfigurationTarget, Uri } from "vscode";
import { readParameter, writeParameter } from "../idfConfiguration";
import { IdfToolsManager } from "../idfToolsManager";
import { dirname, join } from "path";
import { getPythonEnvPath } from "../pythonManager";
import { getEspIdfFromCMake } from "../utils";
import { IdfSetup } from "./types";
import { getIdfMd5sum } from "../setup/espIdfJson";
import { pathExists } from "fs-extra";

export async function useExistingSettingsToMakeNewConfig(workspaceFolder: Uri) {
  const espIdfPath = readParameter("idf.espIdfPath", workspaceFolder);
  const idfPathVersion = await getEspIdfFromCMake(espIdfPath);
  const idfToolsPath = readParameter(
    "idf.toolsPath",
    workspaceFolder
  ) as string;
  const idfToolsManager = await IdfToolsManager.createIdfToolsManager(
    espIdfPath
  );
  const exportedToolsPaths = await idfToolsManager.exportPathsInString(
    join(idfToolsPath, "tools"),
    ["cmake", "ninja"]
  );
  const exportVars = await idfToolsManager.exportVars(
    join(idfToolsPath, "tools"),
    ["cmake", "ninja"]
  );
  const pythonPath = readParameter("idf.pythonInstallPath") as string;
  const virtualEnvPython = await getPythonEnvPath(
    espIdfPath,
    idfToolsPath,
    pythonPath
  );

  const customExtraVars = readParameter(
    "idf.customExtraVars",
    workspaceFolder
  ) as { [key: string]: string };

  let pathNameInEnv: string = Object.keys(process.env).find(
    (k) => k.toUpperCase() == "PATH"
  );

  const gitPath = readParameter("idf.gitPath", workspaceFolder);
  const idfSetupId = getIdfMd5sum(espIdfPath);

  customExtraVars[pathNameInEnv] = exportedToolsPaths;
  customExtraVars["ESP_IDF_VERSION"] = `v${idfPathVersion}`;
  customExtraVars["IDF_TOOLS_PATH"] = idfToolsPath;
  customExtraVars["IDF_PATH"] = espIdfPath;
  customExtraVars["IDF_PYTHON_ENV_PATH"] = dirname(dirname(virtualEnvPython));
  for (const envVar in exportVars) {
    if (envVar) {
      customExtraVars[envVar] = customExtraVars[envVar];
    }
  }
  await writeParameter(
    "idf.customExtraVars",
    customExtraVars,
    ConfigurationTarget.WorkspaceFolder,
    workspaceFolder
  );

  const currentIdfSetup: IdfSetup = {
    activationScript: "",
    id: idfSetupId,
    idfPath: espIdfPath,
    isValid: false,
    gitPath: gitPath,
    version: idfPathVersion,
    toolsPath: idfToolsPath,
    venvPython: virtualEnvPython,
  };

  return currentIdfSetup;
}

export async function computeVirtualEnvPythonPath(workspaceFolder: Uri) {
  let pythonPath = readParameter("idf.pythonInstallPath") as string;
  let espIdfDir = readParameter("idf.espIdfPath", workspaceFolder) as string;
  let idfToolsDir = readParameter("idf.toolsPath", workspaceFolder) as string;
  const idfPathExists = await pathExists(espIdfDir);
  const idfToolsPathExists = await pathExists(idfToolsDir);
  const pythonPathExists = await pathExists(pythonPath);
  if (!idfPathExists || !idfToolsPathExists || !pythonPathExists) {
    return;
  }
  const virtualEnvPython = await getPythonEnvPath(
    espIdfDir,
    idfToolsDir,
    pythonPath
  );
  return virtualEnvPython
}
