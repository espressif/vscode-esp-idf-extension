/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 12th June 2026 5:25:43 pm
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
import { registerIDFCommand } from "../common/registerCommand";
import { openFolderCheck, PreCheck } from "../common/PreCheck";
import { Logger } from "../common/logger";
import { ESP } from "../config";
import { statusBarItems } from "../statusBar";
import { loadIdfSetup } from "../eim/loadIdfSetup";
import {
  getIdfTargetFromSdkconfig,
  updateIdfComponentsTree,
} from "./workspace";
import { commandDictionary, CommandKeys } from "../cmdTreeView/cmdStore";
import {
  chooseConfigurationTarget,
  readParameter,
  writeParameter,
} from "./idf";
import { getEspIdfFromCMake, updateStatus } from "../utils";
import { getCurrentIdfConfiguration } from "./env";
import {
  IOpenOCDConfig,
  OpenOCDManager,
} from "../espIdf/openOcd/openOcdManager";
import { handleCompileCommandsUpdate } from "../clang/checkClangExtension";
import { espIdfCoverageRenderer } from "../coverage/renderer";
import { ConfserverProcess } from "../espIdf/menuconfig/confserver/confServerProcess";

export function registerConfigurationCommands(context: ExtensionContext) {
  registerIDFCommand(context, "espIdf.selectConfTarget", async () => {
    await chooseConfigurationTarget();
  });

  registerIDFCommand(context, "espIdf.selectNotificationMode", async () => {
    const notificationTarget = await window.showQuickPick(
      [
        {
          description: l10n.t(
            "Show no notifications and do not focus tasks output."
          ),
          label: "Silent",
          target: "Silent",
        },
        {
          description: l10n.t(
            "Show notifications but do not focus tasks output."
          ),
          label: "Notifications",
          target: "Notifications",
        },
        {
          description: l10n.t(
            "Do not show notifications but focus tasks output."
          ),
          label: "Output",
          target: "Output",
        },
        {
          description: l10n.t("Show notifications and focus tasks output."),
          label: "All",
          target: "All",
        },
      ],
      { placeHolder: l10n.t("Select the output and notification mode") }
    );
    if (!notificationTarget) {
      return;
    }
    const saveScope = readParameter("idf.saveScope") as ConfigurationTarget;
    const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
    await writeParameter(
      "idf.notificationMode",
      notificationTarget.target,
      saveScope,
      wsFolder
    );
    Logger.infoNotify(
      l10n.t(`Notification mode has changed to {mode}`, {
        mode: notificationTarget.label,
      })
    );
  });

  registerIDFCommand(context, "espIdf.pickAWorkspaceFolder", () => {
    PreCheck.perform([openFolderCheck], async () => {
      const selectCurrentFolderMsg = l10n.t("Select your current folder");
      try {
        const option = await window.showWorkspaceFolderPick({
          placeHolder: selectCurrentFolderMsg,
        });
        if (!option) {
          const noFolderMsg = l10n.t("No workspace selected.");
          Logger.infoNotify(noFolderMsg);
          return;
        }
        ESP.GlobalConfiguration.store.setSelectedWorkspaceFolder(option.uri);
        await loadIdfSetup(option);
        await getIdfTargetFromSdkconfig(option.uri, statusBarItems["target"]);
        if (statusBarItems && statusBarItems["port"]) {
          statusBarItems["port"].text =
            `$(${commandDictionary[CommandKeys.SelectSerialPort].iconId}) ` +
            readParameter("idf.port", option.uri);
        }
        const monitorPort = readParameter(
          "idf.monitorPort",
          option.uri
        ) as string;
        if (statusBarItems && statusBarItems["monitorPort"]) {
          if (monitorPort === "") {
            statusBarItems["monitorPort"].hide();
            statusBarItems["monitorPort"].text = "";
          } else {
            statusBarItems["monitorPort"].show();
            statusBarItems["monitorPort"].text = `$(${
              commandDictionary[CommandKeys.SelectMonitorSerialPort].iconId
            }) ${monitorPort}`;
          }
        }

        updateIdfComponentsTree(option.uri);
        const workspaceFolderInfo = {
          clickCommand: "espIdf.pickAWorkspaceFolder",
          currentWorkSpace: option.name,
          tooltip: option.uri.fsPath,
        };
        updateStatus(statusBarItems["workspace"], workspaceFolderInfo);
        if (statusBarItems["projectConf"]) {
          statusBarItems["projectConf"].dispose();
          delete statusBarItems["projectConf"];
          const selectedConfig = ESP.ProjectConfiguration.store.get<string>(
            ESP.ProjectConfiguration.SELECTED_CONFIG
          );
          ESP.ProjectConfiguration.store.clear(selectedConfig);
          ESP.ProjectConfiguration.store.clear(
            ESP.ProjectConfiguration.SELECTED_CONFIG
          );
        }
        const currentEnvVars = getCurrentIdfConfiguration();

        const idfVersion = await getEspIdfFromCMake(currentEnvVars["IDF_PATH"]);
        if (statusBarItems["currentIdfVersion"]) {
          statusBarItems["currentIdfVersion"].text = idfVersion
            ? `$(${
                commandDictionary[CommandKeys.SelectCurrentIdfVersion].iconId
              }) ESP-IDF v${idfVersion}`
            : `$(${
                commandDictionary[CommandKeys.SelectCurrentIdfVersion].iconId
              }) ESP-IDF InvalidSetup`;
        }
        const openOCDConfig: IOpenOCDConfig = {
          workspace: option.uri,
        } as IOpenOCDConfig;
        OpenOCDManager.init().configureServer(openOCDConfig);
        ConfserverProcess.dispose();
        espIdfCoverageRenderer.setForWorkspace(option.uri);
        handleCompileCommandsUpdate(option.uri, context);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        Logger.errorNotify(errorMsg, error as Error, "pickAWorkspaceFolder");
      }
    });
  });
}
