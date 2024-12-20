/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 28th March 2024 7:18:49 pm
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

import { ConfigurationTarget, StatusBarItem, Uri, window } from "vscode";
import { readParameter } from "../idfConfiguration";
import { getIdfSetups } from "../eim/getExistingSetups";
import { checkIdfSetup, saveSettings } from "../eim/verifySetup";
import { getEspIdfFromCMake } from "../utils";
import { getIdfMd5sum } from "../setup/espIdfJson";
import { useExistingSettingsToMakeNewConfig } from "../eim/migrationTool";

export async function selectIdfSetup(
  workspaceFolder: Uri,
  espIdfStatusBar: StatusBarItem
) {
  let idfSetups = await getIdfSetups();
  if (idfSetups.length === 0) {
    return;
  }
  const onlyValidIdfSetups = idfSetups.filter((i) => i.isValid);
  const idfSetupOptions = onlyValidIdfSetups.map((idfSetup) => {
    return {
      label: `Version: v${idfSetup.version}`,
      description: `IDF_PATH: ${idfSetup.idfPath}`,
      detail: `IDF_TOOLS_PATH: ${idfSetup.toolsPath}`,
      target: idfSetup,
    };
  });
  const selectedIdfSetupOption = await window.showQuickPick(idfSetupOptions, {
    placeHolder: "Select a ESP-IDF version to use",
  });
  if (!selectedIdfSetupOption) {
    return;
  }
  await saveSettings(
    selectedIdfSetupOption.target,
    ConfigurationTarget.WorkspaceFolder,
    workspaceFolder,
    espIdfStatusBar
  );
  return selectedIdfSetupOption.target;
}

export async function getCurrentIdfSetup(
  workspaceFolder: Uri,
  logToChannel: boolean = true
) {
  const customExtraVars = readParameter(
    "idf.customExtraVars",
    workspaceFolder
  ) as { [key: string]: string };
  const idfSetups = await getIdfSetups();
  let currentIdfSetup = idfSetups.find((idfSetup) => {
    idfSetup.idfPath === customExtraVars["IDF_PATH"] &&
      idfSetup.toolsPath === customExtraVars["IDF_TOOLS_PATH"];
  });
  if (!currentIdfSetup) {
    // Using implementation before EIM
    let currentIdfSetup = await useExistingSettingsToMakeNewConfig(workspaceFolder);
    return currentIdfSetup;
  }
  currentIdfSetup.isValid = await checkIdfSetup(
    currentIdfSetup.activationScript,
    logToChannel
  );
  return currentIdfSetup;
}
