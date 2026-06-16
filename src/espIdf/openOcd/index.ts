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

import { ConfigurationTarget, ExtensionContext, workspace } from "vscode";
import { registerIDFCommand } from "../../common/registerCommand";
import { OpenOCDManager } from "./openOcdManager";
import { openFolderCheck, PreCheck, webIdeCheck } from "../../common/PreCheck";
import { CommandKeys } from "../../cmdTreeView/cmdStore";
import { ESP } from "../../config";
import { clearAdapterSerial } from "./adapterSerial";
import { updateOpenOcdAdapterStatusBarItem } from "../../statusBar";

export function registerOpenOCDCommands(context: ExtensionContext) {
  registerIDFCommand(context, "espIdf.openOCDCommand", async () => {
    PreCheck.perform(
      [webIdeCheck, openFolderCheck],
      OpenOCDManager.init().commandHandler
    );
  });

  registerIDFCommand(context, CommandKeys.OpenOcdAdapterStatusBar, () => {
    PreCheck.perform([openFolderCheck], async () => {
      const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
      if (!wsFolder) {
        return;
      }

      // Clear adapter serial (extension workspace state) and adapter location (settings.json)
      clearAdapterSerial(wsFolder.uri);

      const cfg = workspace.getConfiguration("", wsFolder.uri);
      const extraVars =
        cfg.get<{ [key: string]: any }>("idf.customExtraVars") ?? {};
      if (extraVars["OPENOCD_USB_ADAPTER_LOCATION"]) {
        const nextExtraVars = { ...extraVars };
        delete nextExtraVars["OPENOCD_USB_ADAPTER_LOCATION"];
        await cfg.update(
          "idf.customExtraVars",
          nextExtraVars,
          ConfigurationTarget.WorkspaceFolder
        );
      }

      // Stop OpenOCD if it is currently running to avoid keeping the old binding alive.
      if (OpenOCDManager.init().isRunning()) {
        OpenOCDManager.init().stop();
      }

      updateOpenOcdAdapterStatusBarItem(wsFolder.uri);
    });
  });
}
