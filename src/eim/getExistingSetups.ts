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
import { commands, l10n, window } from "vscode";
import { EspIdfJson, IdfSetup } from "./types";
import { checkIdfSetup } from "./verifySetup";

export async function getSelectedEspIdfSetup(logToChannel: boolean = true) {
  const espIdfJson = await getEimIdfJson();

  if (espIdfJson && espIdfJson.idfSelectedId && espIdfJson.idfInstalled) {
    const selectIDF = espIdfJson.idfInstalled.find((idfSetup) => {
      return idfSetup.id === espIdfJson.idfSelectedId;
    });

    if (!selectIDF) {
      const selectIdfNotFound = new Error(
        "idfSelectedId doesn't exist in idfInstalled"
      );
      Logger.error(
        selectIdfNotFound.message,
        selectIdfNotFound,
        "getSelectedEspIdfSetup"
      );
    }

    const idfSetup: IdfSetup = {
      activationScript: selectIDF.activationScript,
      id: selectIDF.id,
      idfPath: selectIDF.path,
      isValid: false,
      gitPath: espIdfJson.gitPath,
      version: selectIDF.name,
      toolsPath: selectIDF.idfToolsPath,
      venvPython: selectIDF.python,
    } as IdfSetup;
    try {
      const isValid = await checkIdfSetup(idfSetup.activationScript, logToChannel);
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
        idfSetup.isValid = await checkIdfSetup(idfSetup.activationScript, logToChannel);
        idfSetups.push(idfSetup);
      } catch (err) {
        const msg = err.message
          ? err.message
          : "Error checkIdfSetup in getIdfSetups";
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
  const espIdfJson = await getEimIdfJson();
  if (
    espIdfJson &&
    espIdfJson.idfInstalled &&
    Object.keys(espIdfJson.idfInstalled).length
  ) {
    for (let idfInstalled of espIdfJson.idfInstalled) {
      let setupConf: IdfSetup = {
        activationScript: idfInstalled.activationScript,
        id: idfInstalled.id,
        idfPath: idfInstalled.path,
        isValid: false,
        gitPath: espIdfJson.gitPath,
        version: idfInstalled.name,
        toolsPath: idfInstalled.idfToolsPath,
        venvPython: idfInstalled.python,
      } as IdfSetup;
      try {
        setupConf.isValid = await checkIdfSetup(setupConf.activationScript, false);
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

export async function getEimIdfJson() {
  const espIdeJsonCustomPath = readParameter("idf.eimIdfJsonPath");
  const espIdePathExists = await pathExists(espIdeJsonCustomPath);
  let eimIdfJsonPath = "";
  if (espIdePathExists) {
    eimIdfJsonPath = espIdeJsonCustomPath;
  } else {
    eimIdfJsonPath =
      process.platform === "win32"
        ? join(process.env.SystemDrive, "Espressif", "tools", "eim_idf.json")
        : join(process.env.HOME, ".espressif", "tools", "eim_idf.json");
  }
  const espIdfJsonExists = await pathExists(eimIdfJsonPath);
  let espIdfJson: EspIdfJson;
  try {
    if (!espIdfJsonExists) {
      throw new Error(`${eimIdfJsonPath} doesn't exists.`);
    }
    espIdfJson = await readJson(eimIdfJsonPath);
  } catch (error) {
    const msg =
      error && error.message
        ? error.message
        : `Error reading ${eimIdfJsonPath}.`;
    Logger.error(msg, error, "getEimIdfJson");
  }
  return espIdfJson;
}
