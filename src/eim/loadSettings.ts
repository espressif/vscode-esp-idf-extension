/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 6th February 2025 11:42:36 am
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

import { EOL } from "os";
import { OutputChannel } from "../logger/outputChannel";
import { execChildProcess } from "../utils";
import { IdfSetup } from "./types";
import { getEnvVarsFromIdfTools } from "../pythonManager";
import { IdfToolsManager } from "../idfToolsManager";
import { delimiter, dirname, join } from "path";
import { getIdfPythonEnvPath } from "./migrationTool";
import { Logger } from "../logger/logger";

export async function getEnvVariables(idfSetup: IdfSetup, logToChannel = false) {
  if (idfSetup.activationScript) {
    return await getEnvVariablesFromActivationScript(idfSetup.activationScript, logToChannel);
  } else {
    return await getEnvVariablesFromIdfSetup(idfSetup);
  }
}

export async function getEnvVariablesFromActivationScript(
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

    let pathNameInEnv: string = Object.keys(process.env).find(
      (k) => k.toUpperCase() == "PATH"
    );

    if (envDict[pathNameInEnv]) {
      envDict[pathNameInEnv] = envDict[pathNameInEnv]
        .replace(process.env[pathNameInEnv], "")
        .replace(new RegExp(`(^${delimiter}|${delimiter}$)`, "g"), "");
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
      "loadSettings getEnvVariablesFromActivationScript",
      undefined,
      false
    );
  }
}

export async function getEnvVariablesFromIdfSetup(idfSetup: IdfSetup) {
  let envVars: { [key: string]: string } = {};
  envVars["IDF_PATH"] = idfSetup.idfPath;
  envVars["IDF_TOOLS_PATH"] = idfSetup.toolsPath;
  if (idfSetup.python) {
    envVars["IDF_PYTHON_ENV_PATH"] = dirname(dirname(idfSetup.python));
  } else {
    idfSetup.python = await getIdfPythonEnvPath(
      idfSetup.idfPath,
      idfSetup.toolsPath,
      idfSetup.sysPythonPath
    );
    envVars["IDF_PYTHON_ENV_PATH"] = dirname(dirname(idfSetup.python));
  }
  const idfToolsManager = await IdfToolsManager.createIdfToolsManager(
    idfSetup.idfPath
  );
  const exportedToolsPaths = await idfToolsManager.exportPathsInString(
    join(idfSetup.toolsPath, "tools"),
    ["cmake", "ninja"]
  );
  envVars["PATH"] = exportedToolsPaths;
  const idfToolsVars = await idfToolsManager.exportVars(idfSetup.toolsPath);
  const idfVars = await getEnvVarsFromIdfTools(
    idfSetup.idfPath,
    idfSetup.toolsPath,
    idfSetup.python
  );
  for (const toolVar in idfToolsVars) {
    envVars[toolVar] = idfToolsVars[toolVar];
  }
  for (const idfVar in idfVars) {
    envVars[idfVar] = idfVars[idfVar];
  }
  return envVars;
}