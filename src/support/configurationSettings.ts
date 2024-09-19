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
import { getVirtualEnvPythonPath } from "../pythonManager";
import { reportObj } from "./types";
import { Uri, workspace } from "vscode";

export async function getConfigurationSettings(
  reportedResult: reportObj,
  scope?: Uri
) {
  const winFlag = process.platform === "win32" ? "Win" : "";
  const conf = workspace.getConfiguration("", scope);
  reportedResult.workspaceFolder = scope ? scope.fsPath: "No workspace folder is open";
  const pythonVenvPath = await getVirtualEnvPythonPath(scope);
  reportedResult.configurationSettings = {
    espAdfPath: conf.get("idf.espAdfPath" + winFlag),
    espIdfPath: conf.get("idf.espIdfPath" + winFlag),
    espMdfPath: conf.get("idf.espMdfPath" + winFlag),
    espMatterPath: conf.get("idf.espMatterPath"),
    espHomeKitPath: conf.get("idf.espHomeKitSdkPath" + winFlag),
    customTerminalExecutable: conf.get("idf.customTerminalExecutable"),
    customTerminalExecutableArgs: conf.get("idf.customTerminalExecutableArgs"),
    customExtraPaths: conf.get("idf.customExtraPaths"),
    customExtraVars: conf.get("idf.customExtraVars"),
    notificationMode: conf.get("idf.notificationMode"),
    pythonBinPath: pythonVenvPath,
    pythonPackages: [],
    serialPort: conf.get("idf.port" + winFlag),
    openOcdConfigs:
      conf.get("idf.openOcdConfigs") ||
      [],
    toolsPath: conf.get("idf.toolsPath" + winFlag),
    systemEnvPath:
      process.platform === "win32" ? process.env.Path : process.env.PATH,
    sysPythonBinPath: conf.get("idf.pythonInstallPath"),
    gitPath: conf.get("idf.gitPath" + winFlag)
  };
}
