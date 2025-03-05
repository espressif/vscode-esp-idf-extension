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
import { EspIdfJson, IdfSetup } from "./types";
import { isIdfSetupValid } from "./verifySetup";
import { getEspIdfFromCMake } from "../utils";
import { loadIdfSetupsFromEspIdfJson } from "./migrationTool";
import { ESP } from "../config";
import { Uri } from "vscode";

export async function getIdfSetups() {
  const workspaceFolderUri = ESP.GlobalConfiguration.store.get<Uri>(
    ESP.GlobalConfiguration.SELECTED_WORKSPACE_FOLDER
  );
  const customVars = readParameter("idf.customExtraVars", workspaceFolderUri) as {
    [key: string]: string;
  };
  const eimIDFSetups = await loadIdfSetupsFromEimIdfJson();
  let resultingIdfSetups = eimIDFSetups;
  if (customVars["IDF_TOOLS_PATH"]) {
    const espIdfCustomVarsJsonSetups = await loadIdfSetupsFromEspIdfJson(customVars["IDF_TOOLS_PATH"]);
    resultingIdfSetups = resultingIdfSetups.concat(espIdfCustomVarsJsonSetups);
  }
  if (process.env.IDF_TOOLS_PATH) {
    const espIdfSysJsonSetups = await loadIdfSetupsFromEspIdfJson(process.env["IDF_TOOLS_PATH"]);
    resultingIdfSetups = resultingIdfSetups.concat(espIdfSysJsonSetups);
  }
  return resultingIdfSetups;
}

export async function loadIdfSetupsFromEimIdfJson() {
  let idfSetups: IdfSetup[] = [];
  const espIdfJson = await getEimIdfJson();
  if (
    espIdfJson &&
    espIdfJson.idfInstalled &&
    Object.keys(espIdfJson.idfInstalled).length
  ) {
    for (let idfInstalled of espIdfJson.idfInstalled) {
      const idfVersion = await getEspIdfFromCMake(idfInstalled.path);
      let setupConf: IdfSetup = {
        activationScript: idfInstalled.activationScript,
        id: idfInstalled.id,
        idfPath: idfInstalled.path,
        isValid: false,
        gitPath: espIdfJson.gitPath,
        version: idfVersion,
        toolsPath: idfInstalled.idfToolsPath,
        python: idfInstalled.python,
        sysPythonPath: "",
      } as IdfSetup;
      try {
        setupConf.isValid = await isIdfSetupValid(setupConf, false);
      } catch (err) {
        const msg = err.message
          ? err.message
          : "Error isIdfSetupValid in loadIdfSetupsFromEimIdfJson";
        Logger.error(msg, err, "loadIdfSetupsFromEimIdfJson");
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
    return espIdfJson;
  } catch (error) {
    const msg =
      error && error.message
        ? error.message
        : `Error reading ${eimIdfJsonPath}.`;
    Logger.error(msg, error, "getEimIdfJson");
  }
}
