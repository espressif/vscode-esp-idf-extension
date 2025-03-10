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
import { spawn } from "../utils";
import { IdfSetup } from "./types";
import { delimiter, join } from "path";
import { getEnvVariablesFromIdfSetup } from "./migrationTool";
import { Logger } from "../logger/logger";

export async function getEnvVariables(idfSetup: IdfSetup) {
  if (idfSetup.activationScript) {
    return await getEnvVariablesFromActivationScript(idfSetup.activationScript);
  } else {
    return await getEnvVariablesFromIdfSetup(idfSetup);
  }
}

export async function getEnvVariablesFromActivationScript(
  activationScriptPath: string
) {
  try {
    const args =
      process.platform === "win32"
        ? [
            "-ExecutionPolicy",
            "Bypass",
            "-NoProfile",
            `'${activationScriptPath.replace(/'/g, "''")}'`,
            "-e",
          ]
        : [`"${activationScriptPath}"`, "-e"];
    const shellPath =
      process.platform === "win32"
        ? "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"
        : "/bin/sh";
    const envVarsOutput = await spawn(shellPath, args, {
      maxBuffer: 500 * 1024,
      cwd: process.cwd(),
      shell: shellPath,
    });
    const envVars = envVarsOutput.toString().trim().split(EOL);
    Logger.error(
      envVarsOutput.toString().trim(),
      new Error("result activationScript"),
      "result activationScript",
      {
        shellPath: shellPath,
        args: args,
      }
    );
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
    Logger.error(
      JSON.stringify(envDict),
      new Error("dictionary activationScript"),
      "result activationScript",
      {
        category: "envDictionary result activationScript",
      }
    );

    if (envDict[pathNameInEnv]) {
      envDict[pathNameInEnv] = envDict[pathNameInEnv]
        .replace(process.env[pathNameInEnv], "")
        .replace(new RegExp(`(^${delimiter}|${delimiter}$)`, "g"), "");
    }

    const pyDir =
      process.platform === "win32"
        ? ["Scripts", "python.exe"]
        : ["bin", "python"];
    envVars["PYTHON"] = join(envVars["IDF_PYTHON_ENV_PATH"], ...pyDir);

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
