/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 13th December 2023 2:25:30 pm
 * Copyright 2023 Espressif Systems (Shanghai) CO LTD
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
import {
  addProcessTask,
  TaskManager,
  throwCapturedTaskFailure,
} from "../../taskManager/taskManager";
import { Logger } from "../../common/logger";
import { join } from "path";
import { getCurrentIdfConfiguration } from "../../configuration/env";
import { requireIdfPath, resolvePythonForIdfPy } from "./validation";

export async function saveDefSdkconfig(
  workspaceFolder: Uri,
  cancelToken?: CancellationToken
) {
  if (cancelToken) {
    cancelToken.onCancellationRequested(() => {
      TaskManager.cancelTasks();
      TaskManager.disposeListeners();
    });
  }
  const modifiedEnv = getCurrentIdfConfiguration();
  const idfPath = requireIdfPath(modifiedEnv);
  const pythonBinPath = await resolvePythonForIdfPy();
  const saveDefConfArgs = [join(idfPath, "tools", "idf.py"), "save-defconfig"];
  const saveDefSdkconfigExecution = addProcessTask(
    "Save Default SDKCONFIG",
    workspaceFolder,
    pythonBinPath,
    saveDefConfArgs,
    workspaceFolder.fsPath,
    modifiedEnv
  );
  try {
    await TaskManager.runTasks();
    await throwCapturedTaskFailure();
    if (!cancelToken?.isCancellationRequested) {
      Logger.infoNotify("def-config has been generated");
    }
  } finally {
    TaskManager.disposeListeners();
  }
  return saveDefSdkconfigExecution;
}
