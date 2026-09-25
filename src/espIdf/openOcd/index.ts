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

import { ConfigurationTarget, ExtensionContext, l10n, window } from "vscode";
import { registerIDFCommand } from "../../common/registerCommand";
import { OpenOCDManager } from "./openOcdManager";
import { openFolderCheck, PreCheck, webIdeCheck } from "../../common/PreCheck";
import { CommandKeys } from "../../cmdTreeView/cmdStore";
import { ESP } from "../../config";
import { clearAdapterSerial, getStoredAdapterSerial } from "./adapterSerial";
import { updateOpenOcdAdapterStatusBarItem } from "../../statusBar";
import { Logger } from "../../common/logger";
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
      await PreCheck.perform([webIdeCheck, openFolderCheck], () =>
        OpenOCDManager.init().commandHandler()
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
        const storedSerial = getStoredAdapterSerial(wsFolder.uri);
        const extraVars = (readParameter("idf.customExtraVars", wsFolder) ||
          {}) as { [key: string]: any };
        const storedLocation = extraVars["OPENOCD_USB_ADAPTER_LOCATION"] as
          | string
          | undefined;

        const selected = await window.showQuickPick(
          [
            {
              label: l10n.t("Select connected board"),
              description: l10n.t(
                "Pin OpenOCD to a board that is connected right now"
              ),
              action: "select" as const,
            },
            {
              label: l10n.t("Clear adapter binding"),
              description: l10n.t(
                "Remove the stored serial and USB location and stop the OpenOCD server"
              ),
              action: "clear" as const,
            },
          ],
          {
            placeHolder: l10n.t(
              "OpenOCD adapter: serial {0}, USB location {1}",
              storedSerial || "-",
              storedLocation || "-"
            ),
            ignoreFocusOut: true,
          }
        );
        if (!selected) {
          return;
        }

        if (selected.action === "select") {
          await selectOpenOcdConfigFiles(wsFolder);
          updateOpenOcdAdapterStatusBarItem(wsFolder.uri);
          return;
        }

        clearAdapterSerial(wsFolder.uri);
        if (storedLocation) {
          const nextExtraVars = { ...extraVars };
          delete nextExtraVars["OPENOCD_USB_ADAPTER_LOCATION"];
          await writeParameter(
            "idf.customExtraVars",
            nextExtraVars,
            ConfigurationTarget.WorkspaceFolder,
            wsFolder
          );
        }

        let stoppedOpenOcd = false;
        if (OpenOCDManager.init().isRunning()) {
          OpenOCDManager.init().stop();
          stoppedOpenOcd = true;
        }

        updateOpenOcdAdapterStatusBarItem(wsFolder.uri);

        if (!storedSerial && !storedLocation) {
          Logger.infoNotify(
            l10n.t("No OpenOCD adapter serial or USB location was stored.")
          );
          return;
        }
        Logger.infoNotify(
          stoppedOpenOcd
            ? l10n.t(
                "OpenOCD adapter serial and USB location cleared. OpenOCD server stopped."
              )
            : l10n.t("OpenOCD adapter serial and USB location cleared.")
        );
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
      await PreCheck.perform([openFolderCheck], async () => {
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
