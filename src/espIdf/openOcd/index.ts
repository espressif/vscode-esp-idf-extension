/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 16th June 2026 5:01:25 pm
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

import { ConfigurationTarget, ExtensionContext } from "vscode";
import { registerIDFCommand } from "../../common/registerCommand";
import { OpenOCDManager } from "./openOcdManager";
import { openFolderCheck, PreCheck, webIdeCheck } from "../../common/PreCheck";
import { CommandKeys } from "../../cmdTreeView/cmdStore";
import { ESP } from "../../config";
import { clearAdapterSerial } from "./adapterSerial";
import { updateOpenOcdAdapterStatusBarItem } from "../../statusBar";
import { readParameter, writeParameter } from "../../configuration/idf";
import {
  getOpenOcdScripts,
  selectOpenOcdConfigFiles,
} from "./boardConfiguration";

export function registerOpenOCDCommands(context: ExtensionContext) {
  registerIDFCommand(
    context,
    "espIdf.openOCDCommand",
    async () => {
      PreCheck.perform(
        [webIdeCheck, openFolderCheck],
        OpenOCDManager.init().commandHandler
      );
    },
    { outputChannel: "OpenOCD" }
  );

  registerIDFCommand(
    context,
    CommandKeys.OpenOcdAdapterStatusBar,
    () => {
      return PreCheck.perform([openFolderCheck], async () => {
        const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();

        // Clear adapter serial (extension workspace state) and adapter location (settings.json)
        clearAdapterSerial(wsFolder.uri);
        const extraVars = readParameter("idf.customExtraVars", wsFolder) as {
          [key: string]: any;
        };
        if (extraVars["OPENOCD_USB_ADAPTER_LOCATION"]) {
          const nextExtraVars = { ...extraVars };
          delete nextExtraVars["OPENOCD_USB_ADAPTER_LOCATION"];
          await writeParameter(
            "idf.customExtraVars",
            nextExtraVars,
            ConfigurationTarget.WorkspaceFolder,
            wsFolder
          );
        }

        // Stop OpenOCD if it is currently running to avoid keeping the old binding alive.
        if (OpenOCDManager.init().isRunning()) {
          OpenOCDManager.init().stop();
        }

        updateOpenOcdAdapterStatusBarItem(wsFolder.uri);
      });
    },
    { outputChannel: "OpenOCD" }
  );

  registerIDFCommand(context, "espIdf.getOpenOcdConfigs", () => {
    const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
    const openOcfConfigs = readParameter(
      "idf.openOcdConfigs",
      wsFolder
    ) as string[];
    let result = "";
    openOcfConfigs.forEach((configFile) => {
      result = result + " -f " + configFile;
    });
    return result.trim();
  });

  registerIDFCommand(
    context,
    "espIdf.selectOpenOcdConfigFiles",
    async () => {
      PreCheck.perform([openFolderCheck], async () => {
        const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
        await selectOpenOcdConfigFiles(wsFolder);
      });
    },
    { outputChannel: "OpenOCD" }
  );

  registerIDFCommand(context, "espIdf.getOpenOcdScriptValue", async () => {
    const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
    return await getOpenOcdScripts(wsFolder);
  });
}
