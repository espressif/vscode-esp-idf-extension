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
  ExtensionContext,
} from "vscode";
import { openFolderCheck } from "../common/PreCheck";
import { withProgressWrapper } from "../common/withProgressWrapper";
import { IDFWebCommandKeys } from "../cmdTreeView/cmdStore";
import { isFlashEncryptionEnabled } from "../flash/verify/flashEncryption";
import { ESP } from "../config";
import { buildMain } from "../build/buildMain";
import { flashMain } from "../flash/main";
import {
  ensureFlashTypeForTask,
  resolvePartitionToUseForTask,
} from "../flash/resolveFlashContext";
import { CustomExecutionTaskResult } from "../taskManager/types";
import { monitorMain } from "../espIdf/monitor/main";
import { registerIDFCommand } from "../common/registerCommand";
import { ErrorCode, CommandErrorMapping } from "../common/error/types";
import { ErrorSeverity } from "../common/customNotifications";

export const buildFlashMonitorCommandErrorMapping: CommandErrorMapping = {
  [ErrorCode.TaskFailedWithOutput]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "Build, flash, or monitor task failed. Check the terminal output for details.",
    logMessage: "Build-flash-monitor task failed with captured output.",
    actions: [
      {
        label: "View Terminal Output",
        execute: () => commands.executeCommand("workbench.action.terminal.focus"),
      },
    ],
  },
  [ErrorCode.FlashTypeNotSelected]: {
    severity: ErrorSeverity.Error,
    userMessage: "Select a flash method before flashing.",
    logMessage: "Build-flash-monitor blocked: idf.flashType is not configured.",
    actions: [
      {
        label: "Select Flash Method",
        execute: () => commands.executeCommand("espIdf.selectFlashMethod"),
      },
    ],
  },
};

function registerBuildFlashMonitorCommand(
  context: ExtensionContext,
  name: string,
  callback: (...args: any[]) => any
) {
  registerIDFCommand(
    context,
    name,
    callback,
    buildFlashMonitorCommandErrorMapping
  );
}

export function registerBuildFlashMonitorCommands(
  context: ExtensionContext
) {
  registerBuildFlashMonitorCommand(context, "espIdf.buildFlashMonitor", async () => {
    const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
    await buildFlashAndMonitor(wsFolder.uri);
  });
}

/**
 * Build, then flash, then open the serial monitor — same ordering as
 * {@link buildFlashAndMonitor} — with optional captured task output for LM tools.
 * Callers supply pre-resolved flash type, partition, and encryption flag (same as
 * `readParameter` / tool-input resolution in language tools).
 *
 * @throws {KnownError} When build, flash, or monitor validation or task execution
 * fails. Callers that need a soft failure result should catch {@link isKnownError}
 * and map to `{ continueFlag: false }`.
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

  await monitorMain(workspaceFolder, monitorNoReset);

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
    async (progress, cancelToken) => {
      const taskWsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
      progress.report({ message: "Building project...", increment: 20 });
      const flashType = await ensureFlashTypeForTask(taskWsFolder, undefined);
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
