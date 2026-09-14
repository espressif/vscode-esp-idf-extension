/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 10th June 2020 4:53:23 pm
 * Copyright 2020 Espressif Systems (Shanghai) CO LTD
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

import { commands, env, ExtensionContext, UIKind } from "vscode";
import { registerIDFCommand } from "../../common/registerCommand";
import {
  minIdfVersionCheck,
  openFolderCheck,
  PreCheck,
  webIdeCheck,
} from "../../common/PreCheck";
import { readParameter } from "../../configuration/idf";
import { IDFWebCommandKeys } from "../../cmdTreeView/cmdStore";
import { ESP } from "../../config";
import { installWebsocketClient } from "./websocket/checkWebsocketClient";
import { monitorMain } from "./main";
import { startWithWebSocket } from "./websocket";

function registerMonitorCommand(
  context: ExtensionContext,
  name: string,
  callback: (...args: any[]) => any
) {
  registerIDFCommand(context, name, callback, { outputChannel: "Monitor" });
}

export function registerMonitorCommands(context: ExtensionContext) {
  registerMonitorCommand(context, "espIdf.monitorDevice", async () => {
    await PreCheck.perform([openFolderCheck], async () => {
      if (env.uiKind === UIKind.Web) {
        commands.executeCommand(IDFWebCommandKeys.Monitor);
        return;
      }
      const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
      await monitorMain(wsFolder);
    });
  });

  registerMonitorCommand(context, "espIdf.launchWSServerAndMonitor", async () => {
    const idfVersionCheck = await minIdfVersionCheck("4.3");
    await PreCheck.perform(
      [idfVersionCheck, webIdeCheck, openFolderCheck],
      async () => {
        const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
        const wsPort = readParameter("idf.wssPort", wsFolder) as number;
        const noReset = readParameter(
          "idf.monitorNoReset",
          wsFolder
        ) as boolean;

        await installWebsocketClient(wsFolder.uri);
        await startWithWebSocket(wsFolder, noReset, wsPort);
      }
    );
  });
}
