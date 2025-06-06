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

import { dirname, join } from "path";
import { execChildProcess, getEspIdfFromCMake } from "../utils";
import { IdfSetup } from "./types";
import { pathExists, readJson } from "fs-extra";
import { ESP } from "../config";
import { getEnvVarsFromIdfTools, getUnixPythonList } from "../pythonManager";
import { IdfToolsManager } from "../idfToolsManager";

export async function getSystemPython(
  espIdfPath: string,
  espIdfToolsPath: string
) {
  if (process.platform !== "win32") {
    const sysPythonList = await getUnixPythonList(__dirname);
    return sysPythonList && sysPythonList.length ? sysPythonList[0] : "python3";
  } else {
    const idfVersion = await getEspIdfFromCMake(espIdfPath);
    const pythonVersionToUse =
      idfVersion >= "5.0"
        ? ESP.URL.IDF_EMBED_PYTHON.VERSION
        : ESP.URL.OLD_IDF_EMBED_PYTHON.VERSION;
    const idfPythonPath = join(
      espIdfToolsPath,
      "tools",
      "idf-python",
      pythonVersionToUse,
      "python.exe"
    );
    const idfPythonPathExists = await pathExists(idfPythonPath);
    return idfPythonPathExists ? idfPythonPath : "";
  }
}

export async function getIdfPythonEnvPath(
  espIdfDir: string,
  idfToolsDir: string,
  pythonBin: string
) {
  const pythonCode = `import sys; print('{}.{}'.format(sys.version_info.major, sys.version_info.minor))`;
  const args = ["-c", pythonCode];
  const rawPythonVersion = await execChildProcess(pythonBin, args, espIdfDir);
  if (!rawPythonVersion) {
    throw new Error("Failed to retrieve Python version. The result is empty.");
  }
  const pythonVersion = rawPythonVersion.replace(/(\n|\r|\r\n)/gm, "");
  const fullEspIdfVersion = await getEspIdfFromCMake(espIdfDir);
  const majorMinorMatches = fullEspIdfVersion.match(/([0-9]+\.[0-9]+).*/);
  const espIdfVersion =
    majorMinorMatches && majorMinorMatches.length > 0
      ? majorMinorMatches[1]
      : "x.x";
  const resultVersion = `idf${espIdfVersion}_py${pythonVersion}_env`;
  return join(idfToolsDir, "python_env", resultVersion);
}

export async function getPythonEnvPath(
  espIdfDir: string,
  idfToolsDir: string,
  pythonBin: string
) {
  const idfPyEnvPath = await getIdfPythonEnvPath(
    espIdfDir,
    idfToolsDir,
    pythonBin
  );
  const pyDir =
    process.platform === "win32"
      ? ["Scripts", "python.exe"]
      : ["bin", "python"];
  const fullIdfPyEnvPath = join(idfPyEnvPath, ...pyDir);
  const pyEnvPathExists = await pathExists(fullIdfPyEnvPath);
  return pyEnvPathExists ? fullIdfPyEnvPath : "";
}

export async function getEnvVariablesFromIdfSetup(idfSetup: IdfSetup) {
  let envVars: { [key: string]: string } = {};
  envVars["IDF_PATH"] = idfSetup.idfPath;
  envVars["IDF_TOOLS_PATH"] = idfSetup.toolsPath;
  envVars["ESP_IDF_VERSION"] = idfSetup.version;
  const idfToolsManager = await IdfToolsManager.createIdfToolsManager(
    idfSetup.idfPath
  );
  const exportedToolsPaths = await idfToolsManager.exportPathsInString(
    join(idfSetup.toolsPath, "tools"),
    ["cmake", "ninja"]
  );
  envVars["PATH"] = exportedToolsPaths;
  const idfToolsVars = await idfToolsManager.exportVars(idfSetup.toolsPath);

  for (const toolVar in idfToolsVars) {
    envVars[toolVar] = idfToolsVars[toolVar];
  }

  if (!idfSetup.python) {
    if (!idfSetup.sysPythonPath) {
      idfSetup.sysPythonPath = await getSystemPython(
        idfSetup.idfPath,
        idfSetup.toolsPath
      );
    }

    idfSetup.python = await getPythonEnvPath(
      idfSetup.idfPath,
      idfSetup.toolsPath,
      idfSetup.sysPythonPath
    );
  }
  const pythonExists = await pathExists(idfSetup.python);

  if (pythonExists) {
    envVars["PYTHON"] = idfSetup.python;
    envVars["IDF_PYTHON_ENV_PATH"] = dirname(dirname(idfSetup.python));
    const idfVars = await getEnvVarsFromIdfTools(
      idfSetup.idfPath,
      idfSetup.toolsPath,
      idfSetup.python
    );
    for (const idfVar in idfVars) {
      envVars[idfVar] = idfVars[idfVar];
    }
  }
  return envVars;
}

export async function loadIdfSetupsFromEspIdfJson(toolsPath: string) {
  const espIdfJson = await loadEspIdfJson(toolsPath);
  let idfSetups: IdfSetup[] = [];
  if (
    espIdfJson &&
    espIdfJson.idfInstalled &&
    Object.keys(espIdfJson.idfInstalled).length
  ) {
    for (let idfInstalledKey of Object.keys(espIdfJson.idfInstalled)) {
      let setupConf: IdfSetup = {
        id: idfInstalledKey,
        idfPath: espIdfJson.idfInstalled[idfInstalledKey].path,
        gitPath: espIdfJson.gitPath,
        version: espIdfJson.idfInstalled[idfInstalledKey].version,
        python: espIdfJson.idfInstalled[idfInstalledKey].python,
        toolsPath: toolsPath,
        isValid: false,
      } as IdfSetup;
      idfSetups.push(setupConf);
    }
  }
  return idfSetups;
}

export interface EspIdfJson {
  $schema: string;
  $id: string;
  _comment: string;
  _warning: string;
  gitPath: string;
  idfToolsPath: string;
  idfSelectedId: string;
  idfInstalled: { [key: string]: IdfInstalled };
}

export interface IdfInstalled {
  version: string;
  python: string;
  path: string;
}

export function getEspIdfJsonTemplate(toolsPath: string) {
  return {
    $schema: "http://json-schema.org/schema#",
    $id: "http://dl.espressif.com/dl/schemas/esp_idf",
    _comment: "Configuration file for ESP-IDF IDEs.",
    _warning:
      "Use / or \\ when specifying path. Single backslash is not allowed by JSON format.",
    gitPath: "",
    idfToolsPath: toolsPath,
    idfSelectedId: "",
    idfInstalled: {},
  } as EspIdfJson;
}

export async function loadEspIdfJson(toolsPath: string) {
  const espIdfJsonPath = join(toolsPath, "esp_idf.json");
  const espIdfJsonExists = await pathExists(espIdfJsonPath);
  let espIdfJson: EspIdfJson;
  try {
    if (!espIdfJsonExists) {
      throw new Error(`${espIdfJsonPath} doesn't exists.`);
    }
    espIdfJson = await readJson(espIdfJsonPath);
  } catch (error) {
    espIdfJson = getEspIdfJsonTemplate(toolsPath);
  }
  return espIdfJson;
}
