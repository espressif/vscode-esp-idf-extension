/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 24th February 2025 5:31:26 pm
 * Copyright 2025 Espressif Systems (Shanghai) CO LTD
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

import { ConfigurationTarget, Uri, window } from "vscode";
import { ESP } from "../config";
import { getIdfSetups } from "./getExistingSetups";
import { IdfSetup } from "./types";
import { getEnvVariables } from "./loadSettings";
import { readParameter, writeParameter } from "../idfConfiguration";

export async function loadIdfSetup(workspaceFolder: Uri, logToChannel: boolean = false) {
  const idfSetups = await getIdfSetups(logToChannel, false);
  
  if (!idfSetups || idfSetups.length < 1) {
    window.showInformationMessage("No ESP-IDF setups found");
    return;
  }
  const currentIdfConfigurationName = readParameter("idf.currentSetup", workspaceFolder);

  let idfSetupToUse: IdfSetup;
  if (currentIdfConfigurationName) {
    idfSetupToUse = idfSetups.find((idfSetup) => {
      return (idfSetup.id = currentIdfConfigurationName);
    });
  } else {
    idfSetupToUse = idfSetups[0];
    await writeParameter(
      "idf.currentSetup",
      idfSetupToUse.idfPath,
      ConfigurationTarget.WorkspaceFolder,
      workspaceFolder
    );
  }

  const envVars = await getEnvVariables(idfSetupToUse);

  ESP.ProjectConfiguration.store.set(
    ESP.ProjectConfiguration.CURRENT_IDF_CONFIGURATION,
    envVars
  );
  return idfSetupToUse;
}
