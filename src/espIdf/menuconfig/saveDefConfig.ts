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
import { addProcessTask, TaskManager } from "../../taskManager";
import { Logger } from "../../logger/logger";
import { join } from "path";
import { pathExists } from "fs-extra";
import { getVirtualEnvPythonPath } from "../../pythonManager";
import { configureEnvVariables } from "../../common/prepareEnv";

export async function saveDefSdkconfig(
  workspaceFolder: Uri,
  cancelToken?: CancellationToken,
  captureOutput: boolean = false
) {
  if (cancelToken) {
    cancelToken.onCancellationRequested(() => {
      TaskManager.cancelTasks();
      TaskManager.disposeListeners();
    });
  }
  const modifiedEnv = await configureEnvVariables(workspaceFolder);
  const saveDefConfArgs = [
    join(modifiedEnv["IDF_PATH"], "tools", "idf.py"),
    "save-defconfig",
  ];
  const pythonBinPath = await getVirtualEnvPythonPath();
  const pythonBinExists = await pathExists(pythonBinPath);
  if (!pythonBinExists) {
    throw new Error(
      `Virtual environment Python path doesn't exist. Configure the extension first.`
    );
  }
  const saveDefSdkconfigExecution = addProcessTask(
    "Save Default SDKCONFIG",
    workspaceFolder,
    pythonBinPath,
    saveDefConfArgs,
    workspaceFolder.fsPath,
    modifiedEnv,
    { captureOutput }
  );
  await TaskManager.runTasks();
  if (cancelToken && !cancelToken.isCancellationRequested) {
    Logger.infoNotify("def-config has been generated");
  }
  TaskManager.disposeListeners();
  return saveDefSdkconfigExecution;
}
