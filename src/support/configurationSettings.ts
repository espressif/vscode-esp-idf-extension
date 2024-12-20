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
import { getEnvVarsFromIdfTools } from "../pythonManager";
import { reportObj } from "./types";
import { Uri, workspace } from "vscode";

export async function getConfigurationSettings(
  reportedResult: reportObj,
  scope?: Uri
) {
  const winFlag = process.platform === "win32" ? "Win" : "";
  const conf = workspace.getConfiguration("", scope);
  reportedResult.workspaceFolder = scope
    ? scope.fsPath
    : "No workspace folder is open";

  const customExtraVars = conf.get("idf.customExtraVars") as {
    [key: string]: string;
  };
  const idfPathDir = customExtraVars["IDF_PATH"] || process.env.IDF_PATH;
  const idfToolsPath =
    customExtraVars["IDF_TOOLS_PATH"] || process.env.IDF_TOOLS_PATH;

  const pyDir =
    process.platform === "win32"
      ? ["Scripts", "python.exe"]
      : ["bin", "python3"];
  const venvPythonPath = join(customExtraVars["IDF_PYTHON_ENV_PATH"], ...pyDir);

  const idfToolsExportVars = await getEnvVarsFromIdfTools(
    idfPathDir,
    idfToolsPath,
    venvPythonPath
  );

  reportedResult.configurationSettings = {
    espAdfPath: conf.get("idf.espAdfPath" + winFlag),
    espIdfPath: idfPathDir,
    espMdfPath: conf.get("idf.espMdfPath" + winFlag),
    espMatterPath: conf.get("idf.espMatterPath"),
    espHomeKitPath: conf.get("idf.espHomeKitSdkPath" + winFlag),
    customTerminalExecutable: conf.get("idf.customTerminalExecutable"),
    customTerminalExecutableArgs: conf.get("idf.customTerminalExecutableArgs"),
    customExtraPaths: customExtraVars["PATH"],
    idfExtraVars: idfToolsExportVars,
    userExtraVars: customExtraVars,
    notificationMode: conf.get("idf.notificationMode"),
    pythonBinPath: venvPythonPath,
    pythonPackages: [],
    serialPort: conf.get("idf.port" + winFlag),
    openOcdConfigs: conf.get("idf.openOcdConfigs") || [],
    toolsPath: idfToolsPath,
    systemEnvPath:
      process.platform === "win32" ? process.env.Path : process.env.PATH,
    gitPath: conf.get("idf.gitPath" + winFlag),
  };
}
