/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 30th December 2020 4:02:17 pm
 * Copyright 2020 Espressif Systems (Shanghai) CO LTD
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { reportObj } from "./types";
import * as vscode from "vscode";

export function getConfigurationSettings(
  reportedResult: reportObj,
  scope?: vscode.ConfigurationScope
) {
  const winFlag = process.platform === "win32" ? "Win" : "";
  const conf = vscode.workspace.getConfiguration("", scope);
  reportedResult.configurationSettings = {
    espAdfPath: conf.get("idf.espAdfPath" + winFlag),
    espIdfPath: conf.get("idf.espIdfPath" + winFlag),
    espMdfPath: conf.get("idf.espMdfPath" + winFlag),
    customExtraPaths: conf.get("idf.customExtraPaths"),
    customExtraVars: conf.get("idf.customExtraVars"),
    pythonBinPath: conf.get("idf.pythonBinPath" + winFlag),
    pythonPackages: [],
    serialPort: conf.get("idf.port" + winFlag),
    openOcdConfigs:
      conf.get("idf.openOcdConfigs") ||
      [],
    toolsPath: conf.get("idf.toolsPath" + winFlag),
    systemEnvPath:
      process.platform === "win32" ? process.env.Path : process.env.PATH,
    gitPath: conf.get("idf.gitPath")
  };
}
