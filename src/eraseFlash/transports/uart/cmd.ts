/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 16th April 2026 5:59:57 pm
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

import { CancellationToken, l10n, Uri } from "vscode";
import { createEraseFlashProcessTask } from "./task";
import { collectExecutions, TaskManager } from "../../../taskManager";
import { EraseFlashSession } from "../../eraseFlashSession";
import { OutputChannel } from "../../../logger/outputChannel";
import { Logger } from "../../../logger/logger";
import { CustomExecutionTaskResult } from "../../../taskManager/customExecution";
import { readSerialPort } from "../../../idfConfiguration";
import { getIdfTargetFromSdkconfig } from "../../../workspaceConfig";

export async function uartEraseFlashCmd(
  workspaceFolderUri: Uri,
  cancelToken: CancellationToken,
  captureOutput?: boolean
): Promise<CustomExecutionTaskResult> {
  cancelToken.onCancellationRequested(() => {
    TaskManager.cancelTasks();
    TaskManager.disposeListeners();
    EraseFlashSession.isErasing = false;
    return;
  });
  const port = await readSerialPort(workspaceFolderUri, false);
  if (!port) {
    Logger.warnNotify(
      l10n.t(
        "No serial port found for current IDF_TARGET: {0}",
        await getIdfTargetFromSdkconfig(workspaceFolderUri)
      )
    );
    return { continueFlag: false, executions: [] };
  }
  const eraseFlashExecution = await createEraseFlashProcessTask(
    workspaceFolderUri,
    port,
    captureOutput
  );
  const eraseFlashResult = await TaskManager.runTasksWithBoolean();
  if (!cancelToken.isCancellationRequested) {
    const msg = "⚡️ Erase flash done";
    OutputChannel.appendLine(msg, "Erase flash");
    Logger.infoNotify(msg);
    OutputChannel.appendLine("Flash memory content has been erased.");
    Logger.infoNotify("Flash memory content has been erased.");
    TaskManager.disposeListeners();
  }
  EraseFlashSession.isErasing = false;
  return {
    continueFlag: eraseFlashResult,
    executions: collectExecutions(eraseFlashExecution),
  };
}
