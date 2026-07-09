/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 18th June 2026 3:17:19 pm
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

import { ExtensionContext, Uri, window } from "vscode";
import { openFolderCheck, PreCheck } from "../../common/PreCheck";
import { registerIDFCommand } from "../../common/registerCommand";
import { join } from "path";
import { NVSPartitionTable } from "./partitionTable/panel";
import { ESP } from "../../config";

export function registerNVSCommand(context: ExtensionContext) {
  registerIDFCommand(
    context,
    "espIdf.webview.nvsPartitionEditor",
    async (args?: Uri) => {
      await PreCheck.perform([openFolderCheck], async () => {
        let filePath = args?.fsPath;
        const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
        if (!args) {
          const nvsFileName = await window.showInputBox({
            placeHolder: "Enter NVS CSV file name",
            value: "",
          });
          if (!nvsFileName) {
            return;
          }
          filePath = join(
            wsFolder.uri.fsPath,
            `${nvsFileName.replace(".csv", "")}.csv`
          );
        }
        if (filePath) {
          NVSPartitionTable.createOrShow(
            context.extensionPath,
            filePath,
            wsFolder.uri
          );
        }
      });
    }
  );
}
