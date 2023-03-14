/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 24th February 2023 10:30:49 pm
 * Copyright 2023 Espressif Systems (Shanghai) CO LTD
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

import { ESP } from "../config";
import { getEspIdfFromCMake } from "../utils";
import { IdfSetup } from "../views/setup/types";
import { getIdfMd5sum, loadEspIdfJson } from "./espIdfJson";
import { checkIdfSetup } from "./setupValidation/espIdfSetup";

export async function getPreviousIdfSetups() {
  const setupKeys = ESP.GlobalConfiguration.store.getIdfSetupKeys();
  const idfSetups: IdfSetup[] = [];
  for (let idfSetupKey of setupKeys) {
    let idfSetup = ESP.GlobalConfiguration.store.get<IdfSetup>(
      idfSetupKey,
      undefined
    );
    idfSetup.isValid = await checkIdfSetup(idfSetup);
    idfSetup.version = await getEspIdfFromCMake(idfSetup.idfPath);
    if (idfSetup) {
      idfSetups.push(idfSetup);
    }
  }
  return idfSetups;
}

export async function clearPreviousIdfSetups() {
  const setupKeys = ESP.GlobalConfiguration.store.getIdfSetupKeys();
  for (let idfSetupKey of setupKeys) {
    ESP.GlobalConfiguration.store.clear(idfSetupKey);
  }
}

export async function createIdfSetup(
  idfPath: string,
  toolsPath: string,
  pythonPath: string,
  gitPath: string
) {
  const idfSetupId = getIdfMd5sum(idfPath);
  const idfVersion = await getEspIdfFromCMake(idfPath);
  const newIdfSetup: IdfSetup = {
    id: idfSetupId,
    idfPath,
    gitPath,
    toolsPath,
    python: pythonPath,
    version: idfVersion,
    isValid: false
  };
  newIdfSetup.isValid = await checkIdfSetup(newIdfSetup);
  addIdfSetup(newIdfSetup);
}

export function addIdfSetup(newIdfSetup: IdfSetup) {
  const setupKeys = ESP.GlobalConfiguration.store.getIdfSetupKeys();
  if (setupKeys.indexOf(newIdfSetup.id) === -1) {
    setupKeys.push(newIdfSetup.id);
    ESP.GlobalConfiguration.store.updateIdfSetupKeys(setupKeys);
  }
  ESP.GlobalConfiguration.store.set(newIdfSetup.id, newIdfSetup);
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
        python: espIdfJson.idfInstalled[idfInstalledKey].python,
        version: espIdfJson.idfInstalled[idfInstalledKey].version,
        toolsPath: toolsPath,
        isValid: false
      } as IdfSetup;
      setupConf.isValid = await checkIdfSetup(setupConf);
      idfSetups.push(setupConf);
    }
    return idfSetups;
  }
}
