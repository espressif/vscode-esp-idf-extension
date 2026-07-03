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

import { CancellationToken, Uri } from "vscode";
import { createEraseFlashProcessTask } from "./task";
import { collectExecutions, TaskManager } from "../../../taskManager/taskManager";
import { OutputChannel } from "../../../common/outputChannel";
import { Logger } from "../../../common/logger";
import { CustomExecutionTaskResult } from "../../../taskManager/types";
import { readSerialPort } from "../../../configuration/idf";
import { getIdfTargetFromSdkconfig } from "../../../configuration/workspace";
import { noSerialPort } from "../../../common/error/knownError";

export async function uartEraseFlashCmd(
  workspaceFolderUri: Uri,
  cancelToken: CancellationToken,
  captureOutput?: boolean
): Promise<CustomExecutionTaskResult> {
  const port = await readSerialPort(workspaceFolderUri, false);
  if (!port) {
    throw noSerialPort(await getIdfTargetFromSdkconfig(workspaceFolderUri));
  }
  const eraseFlashExecution = await createEraseFlashProcessTask(
    workspaceFolderUri,
    port,
    captureOutput
  );
  const eraseFlashResult = await TaskManager.runTasksWithBoolean();
  if (eraseFlashResult && !cancelToken.isCancellationRequested) {
    const msg = "⚡️ Erase flash done";
    OutputChannel.appendLine(msg, "Erase flash");
    Logger.infoNotify(msg);
    OutputChannel.appendLine("Flash memory content has been erased.");
    Logger.infoNotify("Flash memory content has been erased.");
  }
  return {
    continueFlag: eraseFlashResult,
    executions: collectExecutions(eraseFlashExecution),
  };
}
