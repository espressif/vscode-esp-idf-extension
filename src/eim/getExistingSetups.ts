/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 29th November 2024 3:28:00 pm
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

import { pathExists, readJson } from "fs-extra";
import { join } from "path";
import { readParameter } from "../idfConfiguration";
import { Logger } from "../logger/logger";
import { IdfSetup } from "../views/setup/types";
import { checkIdfSetup } from "../setup/setupValidation/espIdfSetup";
import { getEspIdfFromCMake } from "../utils";
import { commands, l10n, window } from "vscode";

export interface EspIdfJson {
  $schema: string;
  $id: string;
  _comment: string;
  _warning: string;
  gitPath: string;
  idfToolsPath: string;
  idfSelectedId: string;
  idfInstalled: { [key: string]: IdfInstalled };
}

export interface IdfInstalled {
  activationScript: string;
  id: string;
  idfToolsPath: string;
  name: string;
  path: string;
  python: string;
}

export async function getSelectedEspIdfSetup(logToChannel: boolean = true) {
  const espIdfJson = await getEspIdeJson();
  if (
    espIdfJson &&
    espIdfJson.idfSelectedId &&
    espIdfJson.idfInstalled[espIdfJson.idfSelectedId]
  ) {
    const idfSetup: IdfSetup = {
      id: espIdfJson.idfSelectedId,
      idfPath: espIdfJson.idfInstalled[espIdfJson.idfSelectedId].path,
      gitPath: espIdfJson.gitPath,
      version: espIdfJson.idfInstalled[espIdfJson.idfSelectedId].name,
      toolsPath: espIdfJson.idfInstalled[espIdfJson.idfSelectedId].idfToolsPath,
      isValid: false,
    } as IdfSetup;
    try {
      const isValid = await checkIdfSetup(idfSetup, logToChannel);
      idfSetup.isValid = isValid;
    } catch (err) {
      const msg = err.message
        ? err.message
        : "Error checkIdfSetup in getSelectedEspIdfSetup";
      Logger.error(msg, err, "getSelectedEspIdfSetup");
    }
    return idfSetup;
  }
}

export async function getIdfSetups(
  logToChannel: boolean = true,
  showNoSetupsFound = true
) {
  const setupKeys = await loadIdfSetupsFromEspIdeJson();
  const idfSetups: IdfSetup[] = [];
  for (let idfSetup of setupKeys) {
    if (idfSetup && idfSetup.idfPath) {
      try {
        idfSetup.isValid = await checkIdfSetup(idfSetup, logToChannel);
        idfSetup.version = await getEspIdfFromCMake(idfSetup.idfPath);
        idfSetups.push(idfSetup);
      } catch (err) {
        const msg = err.message
          ? err.message
          : "Error checkIdfSetup in loadIdfSetupsFromEspIdfJson";
        Logger.error(msg, err, "getIdfSetups");
      }
    }
  }
  if (showNoSetupsFound && idfSetups && idfSetups.length === 0) {
    const action = await window.showInformationMessage(
      l10n.t("No ESP-IDF Setups found"),
      l10n.t("Open ESP-IDF Installation Manager")
    );
    if (action && action === l10n.t("Open ESP-IDF Installation Manager")) {
      commands.executeCommand("espIdf.installManager");
    }
  }
  return idfSetups;
}

export async function loadIdfSetupsFromEspIdeJson() {
  let idfSetups: IdfSetup[] = [];
  const espIdfJson = await getEspIdeJson();
  if (
    espIdfJson &&
    espIdfJson.idfInstalled &&
    Object.keys(espIdfJson.idfInstalled).length
  ) {
    for (let idfInstalledKey of Object.keys(espIdfJson.idfInstalled)) {
      let setupConf: IdfSetup = {
        id: idfInstalledKey,
        idfPath: espIdfJson.idfInstalled[idfInstalledKey].path,
        gitPath: espIdfJson.gitPath,
        version: espIdfJson.idfInstalled[idfInstalledKey].name,
        toolsPath: espIdfJson.idfInstalled[idfInstalledKey].idfToolsPath,
        isValid: false,
      } as IdfSetup;
      try {
        setupConf.isValid = await checkIdfSetup(setupConf, false);
      } catch (err) {
        const msg = err.message
          ? err.message
          : "Error checkIdfSetup in loadIdfSetupsFromEspIdeJson";
        Logger.error(msg, err, "loadIdfSetupsFromEspIdeJson");
        setupConf.isValid = false;
      }
      idfSetups.push(setupConf);
    }
  }
  return idfSetups;
}

export async function getEspIdeJson() {
  const espIdeJsonCustomPath = readParameter("idf.espIdeJsonPath");
  const espIdePathExists = await pathExists(espIdeJsonCustomPath);
  let espIdeJsonPath = "";
  if (espIdePathExists) {
    espIdeJsonPath = espIdeJsonCustomPath;
  } else {
    espIdeJsonPath =
      process.platform === "win32"
        ? join(process.env.SystemDrive, "Espressif", "tools", "esp_ide.json")
        : join(process.env.HOME, ".espressif", "tools", "esp_ide.json");
  }
  const espIdfJsonExists = await pathExists(espIdeJsonPath);
  let espIdfJson: EspIdfJson;
  try {
    if (!espIdfJsonExists) {
      throw new Error(`${espIdeJsonPath} doesn't exists.`);
    }
    espIdfJson = await readJson(espIdeJsonPath);
  } catch (error) {
    const msg =
      error && error.message
        ? error.message
        : `Error reading ${espIdeJsonPath}.`;
    Logger.error(msg, error, "getEspIdeJson");
  }
  return espIdfJson;
}
