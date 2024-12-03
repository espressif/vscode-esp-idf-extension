/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 31st May 2021 7:18:37 pm
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

import { createHash } from "crypto";
import { pathExists, readJson, writeJson } from "fs-extra";
import { join } from "path";
import { getEspIdfFromCMake, isBinInPath } from "../utils";
import { IdfSetup } from "../views/setup/types";
import { checkIdfSetup } from "./setupValidation/espIdfSetup";
import { Logger } from "../logger/logger";

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
  version: string;
  python: string;
  path: string;
}

export function getEspIdfJsonTemplate(toolsPath: string) {
  return {
    $schema: "http://json-schema.org/schema#",
    $id: "http://dl.espressif.com/dl/schemas/esp_idf",
    _comment: "Configuration file for ESP-IDF IDEs.",
    _warning:
      "Use / or \\ when specifying path. Single backslash is not allowed by JSON format.",
    gitPath: "",
    idfToolsPath: toolsPath,
    idfSelectedId: "",
    idfInstalled: {},
  } as EspIdfJson;
}

export function getIdfMd5sum(idfPath: string) {
  const md5Value = createHash("md5")
    .update(idfPath.replace(/\\/g, "/"))
    .digest("hex");
  return `esp-idf-${md5Value}`;
}

export async function loadIdfSetupsFromEspIdfJson(toolsPath: string) {
  const espIdfJson = await loadEspIdfJson(toolsPath);
  if (
    espIdfJson &&
    espIdfJson.idfInstalled &&
    Object.keys(espIdfJson.idfInstalled).length
  ) {
    let idfSetups: IdfSetup[] = [];
    for (let idfInstalledKey of Object.keys(espIdfJson.idfInstalled)) {
      let setupConf: IdfSetup = {
        id: idfInstalledKey,
        idfPath: espIdfJson.idfInstalled[idfInstalledKey].path,
        gitPath: espIdfJson.gitPath,
        version: espIdfJson.idfInstalled[idfInstalledKey].version,
        toolsPath: toolsPath,
        isValid: false,
      } as IdfSetup;
      try {
        setupConf.isValid = await checkIdfSetup(setupConf, false);
      } catch (err) {
        const msg = err.message
          ? err.message
          : "Error checkIdfSetup in loadIdfSetupsFromEspIdfJson";
        Logger.error(msg, err, "loadIdfSetupsFromEspIdfJson");
        setupConf.isValid = false;
      }
      idfSetups.push(setupConf);
    }
    return idfSetups;
  }
}

export async function loadEspIdfJson(toolsPath: string) {
  const espIdfJsonPath = join(toolsPath, "esp_idf.json");
  const espIdfJsonExists = await pathExists(espIdfJsonPath);
  let espIdfJson: EspIdfJson;
  try {
    if (!espIdfJsonExists) {
      throw new Error(`${espIdfJsonPath} doesn't exists.`);
    }
    espIdfJson = await readJson(espIdfJsonPath);
  } catch (error) {
    espIdfJson = getEspIdfJsonTemplate(toolsPath);
  }
  return espIdfJson;
}

export async function addIdfPath(
  idfPath: string,
  pythonPath: string,
  toolsPath: string,
  gitPath: string
) {
  const idfVersion = await getEspIdfFromCMake(idfPath);
  const newIdfPathObj: IdfInstalled = {
    version: idfVersion,
    python: pythonPath,
    path: idfPath,
  };
  const idfId = getIdfMd5sum(idfPath);
  const espIdfObj = await loadEspIdfJson(toolsPath);

  espIdfObj["idfInstalled"][idfId] = newIdfPathObj;
  espIdfObj["idfSelectedId"] = idfId;
  if (!espIdfObj.gitPath) {
    if (gitPath === "git") {
      gitPath = await isBinInPath(gitPath, idfPath, process.env);
    }
    espIdfObj.gitPath = gitPath;
  }
  const espIdfJsonPath = join(toolsPath, "esp_idf.json");
  await writeJson(espIdfJsonPath, espIdfObj, { spaces: 2 });
}

export async function getPropertyFromJson(toolsPath: string, property: string) {
  const espIdfObj = await loadEspIdfJson(toolsPath);
  return Object.keys(espIdfObj).indexOf(property) !== -1
    ? espIdfObj[property]
    : undefined;
}

export async function getSelectedEspIdfId(toolsPath: string) {
  return await getPropertyFromJson(toolsPath, "idfSelectedId");
}

export async function getPropertyWithId(
  toolsPath: string,
  property: string,
  id: string
) {
  const espIdfObj = await loadEspIdfJson(toolsPath);
  return espIdfObj["idfInstalled"][id][property];
}

export async function getSelectedEspIdfPath(toolsPath: string) {
  const selectedIdfId = await getSelectedEspIdfId(toolsPath);
  return await getPropertyWithId(toolsPath, "path", selectedIdfId);
}

export async function getSelectedIdfInstalled(
  toolsPath: string
): Promise<IdfInstalled> {
  const espIdfObj = await loadEspIdfJson(toolsPath);
  const emptyIDfInstalled = {
    version: "",
    python: "",
    path: "",
  };
  return espIdfObj &&
    espIdfObj.idfSelectedId &&
    espIdfObj.idfInstalled &&
    espIdfObj.idfInstalled[espIdfObj.idfSelectedId]
    ? espIdfObj.idfInstalled[espIdfObj.idfSelectedId]
    : emptyIDfInstalled;
}
