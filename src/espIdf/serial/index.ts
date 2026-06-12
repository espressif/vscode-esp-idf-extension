/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 12th June 2026 4:47:21 pm
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

import { commands, ExtensionContext, l10n } from "vscode";
import { registerIDFCommand } from "../../common/registerCommand";
import { openFolderCheck, PreCheck, webIdeCheck } from "../../common/PreCheck";
import { SerialPort } from "./serialPort";
import { getIdfTargetFromSdkconfig } from "../../configuration/workspace";
import { showInfoNotificationWithAction } from "../../common/customNotifications";
import { ESP } from "../../config";

export async function registerSerialPortCmds(context: ExtensionContext) {
  registerIDFCommand(context, "espIdf.selectPort", () => {
    PreCheck.perform([webIdeCheck, openFolderCheck], async () => {
      const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
      if (!wsFolder) {
        return;
      }
      SerialPort.shared().promptUserToSelect(wsFolder.uri, false);
    });
  });

  registerIDFCommand(context, "espIdf.selectMonitorPort", () => {
    PreCheck.perform([webIdeCheck, openFolderCheck], async () => {
      const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
      if (!wsFolder) {
        return;
      }
      SerialPort.shared().promptUserToSelect(wsFolder.uri, true);
    });
  });

  registerIDFCommand(context, "espIdf.detectSerialPort", () => {
    PreCheck.perform([webIdeCheck, openFolderCheck], async () => {
      const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
      if (!wsFolder) {
        return;
      }
      const detectedPort = await SerialPort.detectDefaultPort(wsFolder.uri);
      if (detectedPort) {
        await SerialPort.shared().updatePortListStatus(
          detectedPort,
          wsFolder.uri,
          false
        );
      } else {
        const targetMatch = await getIdfTargetFromSdkconfig(wsFolder.uri);
        const currentTarget = targetMatch ? targetMatch : "esp32";
        const noPortFoundMsg = l10n.t(
          "No serial port found for current IDF_TARGET: {0}",
          currentTarget
        );
        await showInfoNotificationWithAction(
          noPortFoundMsg,
          l10n.t("Detect"),
          () => commands.executeCommand("espIdf.detectSerialPort")
        );
      }
    });
  });
}
