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

import { commands, l10n, StatusBarItem, Uri, window } from "vscode";
import { getIdfSetups } from "../eim/getExistingSetups";
import { saveSettings } from "../eim/verifySetup";

export async function selectIdfSetup(
  workspaceFolder: Uri,
  espIdfStatusBar: StatusBarItem
) {
  let idfSetups = await getIdfSetups();
  if (!idfSetups || (idfSetups && idfSetups.length === 0)) {
    const action = await window.showInformationMessage(
      l10n.t("No ESP-IDF Setups found"),
      l10n.t("Open ESP-IDF Installation Manager")
    );
    if (action && action === l10n.t("Open ESP-IDF Installation Manager")) {
      commands.executeCommand("espIdf.installManager");
    }
  }
  idfSetups = idfSetups.filter(
    (setup, index, self) =>
      index ===
      self.findIndex(
        (s) => s.idfPath === setup.idfPath && s.toolsPath === setup.toolsPath
      )
  );
  const onlyValidIdfSetups = [
    ...new Map(
      idfSetups.filter((i) => i.isValid).map((item) => [item.idfPath, item])
    ).values(),
  ];
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
    workspaceFolder,
    espIdfStatusBar
  );
  return selectedIdfSetupOption.target;
}
