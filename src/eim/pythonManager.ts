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

import { CancellationToken } from "vscode";
import { execChildProcess, getAllBinPathInEnvPath } from "../utils";
import { pathExists } from "fs-extra";
import { Logger } from "../common/logger";
import { join } from "path";
import { OutputChannel } from "../common/outputChannel";
import { EOL } from "os";

export async function getEnvVarsFromIdfTools(
  espIdfPath: string,
  idfToolsPath: string,
  pythonBinPath: string,
  cancelToken?: CancellationToken
) {
  const idfToolsPyPath = join(espIdfPath, "tools", "idf_tools.py");
  const args = [idfToolsPyPath, "export", "--format", "key-value"];
  const modifiedEnv: { [key: string]: string } = <{ [key: string]: string }>(
    Object.assign({}, process.env)
  );
  modifiedEnv.IDF_TOOLS_PATH = idfToolsPath;
  modifiedEnv.IDF_PATH = espIdfPath;
  let idfToolsDict: { [key: string]: string } = {};
  try {
    const doesIdfPathExist = await pathExists(espIdfPath);
    if (!doesIdfPathExist) {
      return idfToolsDict;
    }
    const doesIdfToolsPyExist = await pathExists(idfToolsPyPath);
    if (!doesIdfToolsPyExist) {
      return idfToolsDict;
    }
    const processResult = await execChildProcess(
      pythonBinPath,
      args,
      idfToolsPath,
      OutputChannel.init(),
      { cwd: idfToolsPath, env: modifiedEnv },
      cancelToken
    );
    const lines = processResult.trim().split(EOL);
    for (const l of lines) {
      let keyIndex = l.indexOf("=");
      if (keyIndex === -1) {
        continue;
      }
      let key = l.slice(0, keyIndex);
      let val = l.slice(keyIndex + 1);
      idfToolsDict[key] = val;
    }

    return idfToolsDict;
  } catch (error) {
    const msg =
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string"
        ? error.message
        : "Error at idf_tools.py export --format key-value";
    Logger.errorNotify(msg, error as Error, "getEnvVarsFromIdfTools");
    return idfToolsDict;
  }
}

export async function getUnixPythonList() {
  try {
    let pythonVersions: string[] = [];
    let python3Versions: string[] = [];

    try {
      pythonVersions = await getAllBinPathInEnvPath("python", process.env);
    } catch (pythonError) {
      Logger.warn("Error finding python versions", pythonError);
    }

    try {
      python3Versions = await getAllBinPathInEnvPath("python3", process.env);
    } catch (python3Error) {
      Logger.warn("Error finding python3 versions", python3Error);
    }

    const combinedVersionsArray = [...pythonVersions, ...python3Versions];
    const uniquePathsSet = new Set(
      combinedVersionsArray.filter((path) => path.length > 0)
    );
    const uniquePathsArray = Array.from(uniquePathsSet);

    return uniquePathsArray;
  } catch (error) {
    Logger.errorNotify(
      "Error looking for python in system",
      error as Error,
      "pythonManager getUnixPythonList"
    );
    return ["Not found"];
  }
}
