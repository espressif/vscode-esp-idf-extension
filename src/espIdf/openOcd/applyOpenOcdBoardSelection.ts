/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 14th August 2026
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
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

import { ConfigurationTarget, l10n, WorkspaceFolder } from "vscode";
import { readParameter, writeParameter } from "../../configuration/idf";
import { Logger } from "../../common/logger";
import {
  updateCurrentProfileCustomExtraVars,
  updateCurrentProfileOpenOcdConfigs,
} from "../../project-conf";
import { updateOpenOcdAdapterStatusBarItem } from "../../statusBar";
import {
  clearAdapterSerial,
  storeAdapterSerial,
  supportsSerialFromDetectConfig,
} from "./adapterSerial";

export interface OpenOcdBoardSelection {
  configFiles: string[];
  isConnected?: boolean;
  location?: string;
  serialNumber?: string;
}

/**
 * Clears prior adapter binding, writes OpenOCD configs, and optionally stores
 * connected-board serial/location. Returns the updated customExtraVars snapshot.
 */
export async function applyOpenOcdBoardSelection(
  workspaceFolder: WorkspaceFolder,
  selection: OpenOcdBoardSelection,
  openOCDVersion?: string,
  options?: { notify?: boolean }
): Promise<{ [key: string]: string }> {
  const customExtraVarsRead = readParameter(
    "idf.customExtraVars",
    workspaceFolder
  ) as { [key: string]: string };
  const customExtraVars = { ...customExtraVarsRead };

  clearAdapterSerial(workspaceFolder.uri);
  delete customExtraVars["OPENOCD_USB_ADAPTER_LOCATION"];

  if (
    selection.isConnected &&
    selection.serialNumber &&
    openOCDVersion &&
    supportsSerialFromDetectConfig(openOCDVersion)
  ) {
    storeAdapterSerial(workspaceFolder.uri, selection.serialNumber);
    updateOpenOcdAdapterStatusBarItem(workspaceFolder.uri);
  }

  const configFiles = selection.configFiles || [];
  await writeParameter(
    "idf.openOcdConfigs",
    configFiles,
    ConfigurationTarget.WorkspaceFolder,
    workspaceFolder
  );

  if (selection.isConnected && selection.location) {
    const location = selection.location.replace("usb://", "");
    customExtraVars["OPENOCD_USB_ADAPTER_LOCATION"] = location;
    await updateCurrentProfileCustomExtraVars(
      { OPENOCD_USB_ADAPTER_LOCATION: location },
      workspaceFolder.uri
    );
  }

  await writeParameter(
    "idf.customExtraVars",
    customExtraVars,
    ConfigurationTarget.WorkspaceFolder,
    workspaceFolder
  );
  await updateCurrentProfileOpenOcdConfigs(configFiles, workspaceFolder.uri);

  if (options?.notify !== false) {
    Logger.infoNotify(
      l10n.t(`OpenOCD Board configuration files set to {boards}.`, {
        boards: configFiles.join(","),
      })
    );
  }

  return customExtraVars;
}
