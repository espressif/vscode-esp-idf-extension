/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 30th March 2026 2:41:05 pm
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

import { openFolderCheck, PreCheck } from "../common/PreCheck";
import { ESP } from "../config";
import { NotificationMode, readParameter } from "../idfConfiguration";
import {
  CancellationToken,
  ExtensionContext,
  Progress,
  ProgressLocation,
  Uri,
  window,
  workspace,
} from "vscode";
import { buildMain } from "./buildMain";
import { registerIDFCommand } from "../common/registerCommand";

export async function registerBuildCommands(context: ExtensionContext) {
  registerIDFCommand(context, "espIdf.buildDevice", build);
  registerIDFCommand(context, "espIdf.buildDFU", () =>
    build(ESP.FlashType.DFU)
  );
  registerIDFCommand(context, "espIdf.buildApp", () =>
    build(undefined, ESP.BuildType.App)
  );
  registerIDFCommand(context, "espIdf.buildBootloader", () =>
    build(undefined, ESP.BuildType.Bootloader)
  );
  registerIDFCommand(context, "espIdf.buildPartitionTable", () =>
    build(undefined, ESP.BuildType.PartitionTable)
  );
}

export async function build(
  flashType: ESP.FlashType,
  buildType?: ESP.BuildType
): Promise<void> {
  PreCheck.perform([openFolderCheck], async () => {
    const storedUri = ESP.GlobalConfiguration.store.get<Uri>(
      ESP.GlobalConfiguration.SELECTED_WORKSPACE_FOLDER
    );
    const wsFolder = workspace.getWorkspaceFolder(storedUri);
    const notificationMode = readParameter(
      "idf.notificationMode",
      wsFolder
    ) as string;
    const progressLocation =
      notificationMode === NotificationMode.All ||
      notificationMode === NotificationMode.Notifications
        ? ProgressLocation.Notification
        : ProgressLocation.Window;
    await window.withProgress(
      {
        cancellable: true,
        location: progressLocation,
        title: "ESP-IDF: Building project",
      },
      async (
        progress: Progress<{ message: string; increment: number }>,
        cancelToken: CancellationToken
      ) => {
        if (!flashType) {
          flashType = readParameter("idf.flashType", wsFolder) as ESP.FlashType;
        }
        await buildMain(wsFolder.uri, cancelToken, flashType, buildType);
      }
    );
  });
}
