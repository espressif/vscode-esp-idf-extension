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

import { ExtensionContext } from "vscode";
import { registerIDFCommand } from "../../common/registerCommand";
import { openFolderCheck, PreCheck, webIdeCheck } from "../../common/PreCheck";
import { SerialPort } from "./serialPort";
import { ESP } from "../../config";

function registerSerialCommand(
  context: ExtensionContext,
  name: string,
  callback: (...args: any[]) => any
) {
  registerIDFCommand(context, name, callback, { outputChannel: "Serial port" });
}

export function registerSerialPortCmds(context: ExtensionContext) {
  registerSerialCommand(context, "espIdf.selectPort", async () => {
    return PreCheck.perform([webIdeCheck, openFolderCheck], async () => {
      const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
      if (!wsFolder) {
        return;
      }
      await SerialPort.shared().promptUserToSelect(wsFolder.uri, false);
    });
  });

  registerSerialCommand(context, "espIdf.selectMonitorPort", async () => {
    return PreCheck.perform([webIdeCheck, openFolderCheck], async () => {
      const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
      if (!wsFolder) {
        return;
      }
      await SerialPort.shared().promptUserToSelect(wsFolder.uri, true);
    });
  });

  registerSerialCommand(context, "espIdf.detectSerialPort", async () => {
    return PreCheck.perform([webIdeCheck, openFolderCheck], async () => {
      const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
      if (!wsFolder) {
        return;
      }
      const detectedPort = await SerialPort.detectDefaultPort(wsFolder.uri);
      await SerialPort.shared().updatePortListStatus(
        detectedPort,
        wsFolder.uri,
        false
      );
    });
  });
}
