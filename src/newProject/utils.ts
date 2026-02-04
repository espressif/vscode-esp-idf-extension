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
import { readJSON } from "fs-extra";
import { setClangSettings } from "../clang/index";
import { IdfSetup } from "../eim/types";
import { Uri } from "vscode";

export async function setCurrentSettingsInTemplate(
  settingsJsonPath: string,
  idfSetup: IdfSetup,
  port: string,
  selectedIdfTarget: string,
  workspace: Uri,
  openOcdConfigs?: string
) {
  const settingsJson = await readJSON(settingsJsonPath);
  const isWin = process.platform === "win32" ? "Win" : "";
  if (openOcdConfigs) {
    settingsJson["idf.openOcdConfigs"] =
      openOcdConfigs.indexOf(",") !== -1
        ? openOcdConfigs.split(",")
        : [openOcdConfigs];
  }
  if (port.indexOf("no port") === -1) {
    settingsJson["idf.port" + isWin] = port;
  }
  if (idfSetup.idfPath) {
    settingsJson["idf.currentSetup"] = idfSetup.idfPath;
  }
  if (selectedIdfTarget) {
    settingsJson["idf.customExtraVars"] =
      settingsJson["idf.customExtraVars"] || {};
    settingsJson["idf.customExtraVars"]["IDF_TARGET"] = selectedIdfTarget;
  }
  await setClangSettings(settingsJson, workspace);
  return settingsJson;
}
