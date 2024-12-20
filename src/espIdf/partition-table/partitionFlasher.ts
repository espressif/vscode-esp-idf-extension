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

import { basename, join } from "path";
import { Progress, ProgressLocation, Uri, window } from "vscode";
import { NotificationMode, readParameter } from "../../idfConfiguration";
import { Logger } from "../../logger/logger";
import { appendIdfAndToolsToPath, spawn } from "../../utils";
import { getVirtualEnvPythonPath } from "../../pythonManager";

export async function flashBinaryToPartition(
  offset: string,
  binPath: string,
  workspaceFolder: Uri
) {
  const notificationMode = readParameter(
    "idf.notificationMode",
    workspaceFolder
  ) as string;
  const progressLocation =
    notificationMode === NotificationMode.All ||
    notificationMode === NotificationMode.Notifications
      ? ProgressLocation.Notification
      : ProgressLocation.Window;
  await window.withProgress(
    {
      cancellable: false,
      location: progressLocation,
      title: "ESP-IDF: Flashing binary to device",
    },
    async (progress: Progress<{ message: string; increment: number }>) => {
      try {
        const modifiedEnv = await appendIdfAndToolsToPath(workspaceFolder);
        const serialPort = readParameter("idf.port", workspaceFolder);
        const idfPath = modifiedEnv["IDF_PATH"];
        const pythonBinPath = await getVirtualEnvPythonPath(workspaceFolder);
        const esptoolPath = join(
          idfPath,
          "components",
          "esptool_py",
          "esptool",
          "esptool.py"
        );

        const flashingOutput = await spawn(
          pythonBinPath,
          [esptoolPath, "-p", serialPort, "write_flash", offset, binPath],
          {
            cwd: workspaceFolder.fsPath,
            env: modifiedEnv,
          }
        );
        window.showInformationMessage(
          `Binary ${basename(binPath)} is flashed in ${offset}`
        );
      } catch (error) {
        let msg = error.message
          ? error.message
          : "Error flashing binary to device";
        Logger.errorNotify(msg, error, "flashBinaryToPartition");
      }
    }
  );
}
