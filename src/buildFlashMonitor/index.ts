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

import { commands, env, Uri, UIKind, workspace } from "vscode";
import { openFolderCheck } from "../common/PreCheck";
import { withProgressWrapper } from "../common/withProgressWrapper";
import { shouldDisableMonitorReset } from "../utils";
import { IDFWebCommandKeys } from "../cmdTreeView/cmdStore";
import { isFlashEncryptionEnabled } from "../flash/verify/flashEncryption";
import { ESP } from "../config";
import { IDFMonitor } from "../espIdf/monitor";
import { buildMain } from "../build/buildMain";
import { flashMain } from "../flash/main";
import { createNewIdfMonitor } from "../espIdf/monitor/command";
import {
  resolveFlashTypeForTask,
  resolvePartitionToUseForTask,
} from "../flash/resolveFlashContext";
import { interruptMonitorWithDelay } from "../espIdf/monitor/interruptMonitorWithDelay";

export async function buildFlashAndMonitor(
  workspaceFolderUri: Uri,
  noResetMonitor?: boolean
) {
  const wsFolder =
    workspace.getWorkspaceFolder(workspaceFolderUri) ??
    ESP.GlobalConfiguration.store.getSelectedWorkspaceFolderUri();

  await withProgressWrapper(
    [openFolderCheck],
    "ESP-IDF:",
    async (progress, cancelToken, taskWsFolder) => {
      const folderUri = taskWsFolder!.uri;
      progress.report({ message: "Building project...", increment: 20 });
      const flashType = resolveFlashTypeForTask(taskWsFolder, undefined);
      const buildCmdResults = await buildMain(
        folderUri,
        cancelToken,
        flashType
      );
      if (!buildCmdResults.continueFlag) {
        return;
      }
      if (env.uiKind === UIKind.Web) {
        commands.executeCommand(IDFWebCommandKeys.FlashAndMonitor);
        return;
      }
      progress.report({
        message: "Flashing project into device...",
        increment: 60,
      });

      const encryptPartitions = await isFlashEncryptionEnabled(folderUri);
      const partitionToUse = resolvePartitionToUseForTask(
        taskWsFolder,
        undefined
      );

      const canContinue = await flashMain(
        folderUri,
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
      await interruptMonitorWithDelay(workspaceFolderUri);
      const noReset =
        typeof noResetMonitor !== "undefined"
          ? noResetMonitor
          : await shouldDisableMonitorReset(folderUri);
      await createNewIdfMonitor(folderUri, noReset);
    },
    { workspaceFolder: wsFolder }
  );
}
