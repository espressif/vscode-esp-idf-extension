/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 19th July 2021 7:11:49 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { basename } from "path";
import { Progress, ProgressLocation, window, workspace } from "vscode";
import { readParameter } from "../../idfConfiguration";
import { Logger } from "../../logger/logger";
import { appendIdfAndToolsToPath, PreCheck, spawn } from "../../utils";

export async function flashBinaryToPartition(offset: string, binPath: string) {
  await window.withProgress(
    {
      cancellable: false,
      location: ProgressLocation.Notification,
      title: "ESP-IDF: Flashing binary to device",
    },
    async (progress: Progress<{ message: string; increment: number }>) => {
      try {
        const workspaceFolder = PreCheck.isWorkspaceFolderOpen()
          ? workspace.workspaceFolders[0].uri.fsPath
          : "";

        const modifiedEnv = appendIdfAndToolsToPath();
        const serialPort = readParameter("idf.port");

        const cmdResult = await spawn(
          "esptool.py",
          ["-p", serialPort, "write_flash", offset, binPath],
          {
            cwd: workspaceFolder,
            env: modifiedEnv,
          }
        );
        window.showInformationMessage(
          `Binary ${basename(binPath)} is flashed in ${offset}`
        );
      } catch (error) {
        let msg = error.message
          ? error.message
          : "Error getting partitions from device";
        Logger.errorNotify(msg, error);
      }
    }
  );
}
