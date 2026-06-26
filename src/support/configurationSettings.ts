/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 30th December 2020 4:02:17 pm
 * Copyright 2020 Espressif Systems (Shanghai) CO LTD
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
import { reportObj } from "./types";
import { Uri, workspace } from "vscode";
import { getCurrentIdfConfiguration } from "../configuration/env";
import { isBinInPath } from "../utils";

export function getIdfSetupVarsForReport(envVars: { [key: string]: string }) {
  const setupVars: { [key: string]: string } = {};
  for (const [key, value] of Object.entries(envVars)) {
    if (process.env[key] !== value) {
      setupVars[key] = value;
    }
  }
  return setupVars;
}

export async function getConfigurationSettings(
  reportedResult: reportObj,
  scope?: Uri
) {
  const winFlag = process.platform === "win32" ? "Win" : "";
  const conf = workspace.getConfiguration("", scope);
  reportedResult.workspaceFolder = scope
    ? scope.fsPath
    : "No workspace folder is open";

  const currentEnvVars = getCurrentIdfConfiguration();

  const userExtraVars = conf.get("idf.customExtraVars") as {
    [key: string]: string;
  };
  const idfPathDir =
    userExtraVars?.IDF_PATH ||
    currentEnvVars["IDF_PATH"] ||
    process.env.IDF_PATH ||
    "";
  const idfToolsPath =
    userExtraVars?.IDF_TOOLS_PATH ||
    currentEnvVars["IDF_TOOLS_PATH"] ||
    process.env.IDF_TOOLS_PATH ||
    "";

  const pyDir =
    process.platform === "win32"
      ? ["Scripts", "python.exe"]
      : ["bin", "python3"];
  const idfPythonEnvPath =
    userExtraVars?.IDF_PYTHON_ENV_PATH ||
    currentEnvVars["IDF_PYTHON_ENV_PATH"] ||
    process.env.IDF_PYTHON_ENV_PATH ||
    "";
  const venvPythonPath = idfPythonEnvPath
    ? join(idfPythonEnvPath, ...pyDir)
    : "";

  const gitPath = await isBinInPath("git", currentEnvVars);

  let pathNameInEnv: string =
    Object.keys(process.env).find((k) => k.toUpperCase() == "PATH") || "PATH";
  const systemPath = process.env[pathNameInEnv] || "";
  const customExtraPaths = (
    currentEnvVars[pathNameInEnv] || systemPath
  ).replace(systemPath, "");

  reportedResult.configurationSettings = {
    customTerminalExecutable: conf.get("idf.customTerminalExecutable") || "",
    customTerminalExecutableArgs:
      conf.get("idf.customTerminalExecutableArgs") || [],
    customOpenOcdPath: conf.get("idf.customOpenOCDPath") || "",
    flashType: conf.get("idf.flashType") || "",
    flashPartitionToUse: conf.get("idf.flashPartitionToUse") || "",
    customExtraPaths: customExtraPaths,
    espIdfPath: idfPathDir,
    espAdfPath: userExtraVars["ADF_PATH"] || "",
    idfExtraVars: getIdfSetupVarsForReport(currentEnvVars),
    userExtraVars: userExtraVars,
    pythonBinPath: venvPythonPath,
    gitPath: gitPath || "",
    pythonPackages: [],
    serialPort: conf.get("idf.port" + winFlag) || "",
    openOCDDebugLevel: conf.get("idf.openOcdDebugLevel") || "2",
    openOcdConfigs: conf.get("idf.openOcdConfigs") || [],
    openOcdLaunchArgs: conf.get("idf.openOcdLaunchArgs") || [],
    toolsPath: idfToolsPath,
    systemEnvPath: systemPath,
    notificationMode: conf.get("idf.notificationMode") || "",
  };
}
