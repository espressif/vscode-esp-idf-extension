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

import { join } from "path";
import { execChildProcess, getEspIdfFromCMake } from "../utils";
import { IdfSetup } from "./types";
import { pathExists } from "fs-extra";
import { ESP } from "../config";
import { checkIdfSetup } from "./verifySetup";
import { Logger } from "../logger/logger";

export async function getExtensionGlobalIdfSetups(
  logToChannel: boolean = true
) {
  const setupKeys = ESP.GlobalConfiguration.store.getIdfSetupKeys();
  const idfSetups: IdfSetup[] = [];
  for (let idfSetupKey of setupKeys) {
    let idfSetup = ESP.GlobalConfiguration.store.get<IdfSetup>(
      idfSetupKey,
      undefined
    );
    if (idfSetup && idfSetup.idfPath) {
      try {
        idfSetup.isValid = await checkIdfSetup(idfSetup, logToChannel);
        idfSetup.version = await getEspIdfFromCMake(idfSetup.idfPath);
        idfSetups.push(idfSetup);
      } catch (err) {
        const msg = err.message
          ? err.message
          : "Error checkIdfSetup in getExtensionGlobalIdfSetups";
        Logger.error(msg, err, "getExtensionGlobalIdfSetups");
        ESP.GlobalConfiguration.store.clearIdfSetup(idfSetup.id);
      }
    }
  }
  return idfSetups;
}

export async function getIdfPythonEnvPath(
  espIdfDir: string,
  idfToolsDir: string,
  pythonBin: string
) {
  const pythonCode = `import sys; print('{}.{}'.format(sys.version_info.major, sys.version_info.minor))`;
  const args = ["-c", pythonCode];
  const pythonVersion = (
    await execChildProcess(pythonBin, args, espIdfDir)
  ).replace(/(\n|\r|\r\n)/gm, "");
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
