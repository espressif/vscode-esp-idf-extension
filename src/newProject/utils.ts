/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 27th July 2021 4:35:42 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
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

import { readParameter } from "../idfConfiguration";
import { readJSON } from "fs-extra";
import { Uri } from "vscode";

export async function setCurrentSettingsInTemplate(
  settingsJsonPath: string,
  idfPathDir: string,
  toolsPath: string,
  port: string,
  openOcdConfigs?: string,
  workspace?: Uri
) {
  const settingsJson = await readJSON(settingsJsonPath);
  const isWin = process.platform === "win32" ? "Win" : "";
  const customExtraVars = readParameter(
    "idf.customExtraVars",
    workspace
  ) as { [key: string]: string };
  customExtraVars["IDF_PATH"] = idfPathDir;
  customExtraVars["IDF_TOOLS_PATH"] = toolsPath;

  settingsJson["idf.customExtraVars"] = customExtraVars;
  if (openOcdConfigs) {
    settingsJson["idf.openOcdConfigs"] =
      openOcdConfigs.indexOf(",") !== -1
        ? openOcdConfigs.split(",")
        : [openOcdConfigs];
  }
  if (port.indexOf("no port") === -1) {
    settingsJson["idf.port" + isWin] = port;
  }
  return settingsJson;
}
