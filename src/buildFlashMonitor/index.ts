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
  Uri,
  UIKind,
  workspace,
  WorkspaceFolder,
} from "vscode";
import { openFolderCheck } from "../common/PreCheck";
import { withProgressWrapper } from "../common/withProgressWrapper";
import { IDFWebCommandKeys } from "../cmdTreeView/cmdStore";
import { isFlashEncryptionEnabled } from "../flash/verify/flashEncryption";
import { ESP } from "../config";
import { buildMain } from "../build/buildMain";
import { flashMain } from "../flash/main";
import {
  resolveFlashTypeForTask,
  resolvePartitionToUseForTask,
} from "../flash/resolveFlashContext";
import { CustomExecutionTaskResult } from "../taskManager/customExecution";
import { monitorMain } from "../espIdf/monitor/main";

/**
 * Build, then flash, then open the serial monitor — same ordering as
 * {@link buildFlashAndMonitor} — with optional captured task output for LM tools.
 * Callers supply pre-resolved flash type, partition, and encryption flag (same as
 * `readParameter` / tool-input resolution in language tools).
 */
export async function buildFlashAndMonitorCapture(
  workspaceFolder: WorkspaceFolder,
  token: CancellationToken,
  captureOutput: boolean,
  flashType: ESP.FlashType,
  partitionToUse: ESP.BuildType | undefined,
  monitorNoReset?: boolean,
  onBeforeFlash?: () => void,
  onBeforeMonitor?: () => void
): Promise<CustomExecutionTaskResult> {
  const executions: CustomExecutionTaskResult["executions"] = [];

  const buildCmdResults = await buildMain(
    workspaceFolder.uri,
    token,
    flashType,
    partitionToUse,
    captureOutput
  );
  executions.push(...buildCmdResults.executions);
  if (!buildCmdResults.continueFlag) {
    return { continueFlag: false, executions };
  }

  if (env.uiKind === UIKind.Web) {
    await commands.executeCommand(IDFWebCommandKeys.FlashAndMonitor);
    return { continueFlag: true, executions };
  }

  onBeforeFlash?.();

  const encryptPartitions = await isFlashEncryptionEnabled(workspaceFolder.uri);

  const flashResult = await flashMain(
    workspaceFolder.uri,
    token,
    flashType,
    encryptPartitions,
    partitionToUse,
    captureOutput
  );
  executions.push(...flashResult.executions);
  if (!flashResult.continueFlag) {
    return { continueFlag: false, executions };
  }

  onBeforeMonitor?.();

  await monitorMain(workspaceFolder);

  return { continueFlag: true, executions };
}

export async function buildFlashAndMonitor(
  workspaceFolderUri: Uri,
  noResetMonitor?: boolean
) {
  const wsFolder =
    workspace.getWorkspaceFolder(workspaceFolderUri) ??
    ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();

  await withProgressWrapper(
    [openFolderCheck],
    "ESP-IDF: Build, Flash & Monitor",
    async (progress, cancelToken, taskWsFolder) => {
      progress.report({ message: "Building project...", increment: 20 });
      const flashType =
        resolveFlashTypeForTask(taskWsFolder, undefined) ?? ESP.FlashType.UART;
      const partitionToUse = resolvePartitionToUseForTask(
        taskWsFolder,
        undefined
      );

      const result = await buildFlashAndMonitorCapture(
        taskWsFolder,
        cancelToken,
        false,
        flashType,
        partitionToUse,
        noResetMonitor,
        () =>
          progress.report({
            message: "Flashing project into device...",
            increment: 60,
          }),
        () =>
          progress.report({
            message: "Launching monitor...",
            increment: 10,
          })
      );
      if (!result.continueFlag) {
        return;
      }
    },
    { workspaceFolder: wsFolder }
  );
}
