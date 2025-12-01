/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 26th November 2025 10:54:44 am
 * Copyright 2025 Espressif Systems (Shanghai) CO LTD
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

import {
  CancellationToken,
  commands,
  env,
  l10n,
  Progress,
  ProgressLocation,
  UIKind,
  Uri,
  window,
} from "vscode";
import { openFolderCheck } from "../common/PreCheck";
import { NotificationMode, readParameter } from "../idfConfiguration";
import { PreCheck, shouldDisableMonitorReset } from "../utils";
import { IDFWebCommandKeys } from "../cmdTreeView/cmdStore";
import { isFlashEncryptionEnabled } from "../flash/verifyFlashEncryption";
import { ESP } from "../config";
import { IDFMonitor } from "../espIdf/monitor";
import { buildCommand } from "../build/buildCmd";
import { startFlashing } from "../flash/startFlashing";
import { createNewIdfMonitor } from "../espIdf/monitor/command";

export async function buildFlashAndMonitor(
  workspaceFolderUri: Uri,
  noResetMonitor?: boolean
) {
  await PreCheck.perform([openFolderCheck], async () => {
    const notificationMode = readParameter(
      "idf.notificationMode",
      workspaceFolderUri
    ) as string;
    const currentProgressLocation =
      notificationMode === NotificationMode.All ||
      notificationMode === NotificationMode.Notifications
        ? ProgressLocation.Notification
        : ProgressLocation.Window;

    await window.withProgress(
      {
        cancellable: true,
        location: currentProgressLocation,
        title: "ESP-IDF:",
      },
      async (
        progress: Progress<{ message: string; increment: number }>,
        cancelToken: CancellationToken
      ) => {
        progress.report({ message: "Building project...", increment: 20 });
        const flashType = readParameter("idf.flashType", workspaceFolderUri);
        let canContinue = await buildCommand(
          workspaceFolderUri,
          cancelToken,
          flashType
        );
        if (!canContinue) {
          return;
        }
        // Re route to ESP-IDF Web extension if using Codespaces or Browser
        if (env.uiKind === UIKind.Web) {
          commands.executeCommand(IDFWebCommandKeys.FlashAndMonitor);
          return;
        }
        progress.report({
          message: "Flashing project into device...",
          increment: 60,
        });

        let encryptPartitions = await isFlashEncryptionEnabled(
          workspaceFolderUri
        );

        let partitionToUse = readParameter(
          "idf.flashPartitionToUse",
          workspaceFolderUri
        ) as ESP.BuildType;

        if (
          partitionToUse &&
          !["app", "bootloader", "partition-table"].includes(partitionToUse)
        ) {
          partitionToUse = undefined;
        }

        canContinue = await startFlashing(
          workspaceFolderUri,
          cancelToken,
          flashType,
          encryptPartitions,
          partitionToUse
        );
        if (!canContinue) {
          return;
        }
        progress.report({
          message: "Launching monitor...",
          increment: 10,
        });
        if (IDFMonitor.terminal) {
          IDFMonitor.terminal.sendText(ESP.CTRL_RBRACKET);
        }
        const noReset =
          typeof noResetMonitor !== "undefined"
            ? noResetMonitor
            : await shouldDisableMonitorReset(workspaceFolderUri);
        await createNewIdfMonitor(workspaceFolderUri, noReset);
      }
    );
  });
}
