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

import {
  CancellationToken,
  ProcessExecution,
  ProcessExecutionOptions,
  TaskPanelKind,
  TaskPresentationOptions,
  TaskRevealKind,
  TaskScope,
  Uri,
  workspace,
} from "vscode";
import { TaskManager } from "../../taskManager";
import { readParameter } from "../../idfConfiguration";
import { Logger } from "../../logger/logger";
import { join } from "path";
import { appendIdfAndToolsToPath } from "../../utils";
import { pathExists } from "fs-extra";

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
  const idfPath = readParameter("idf.espIdfPath", workspaceFolder);
  const isSilentMode = readParameter(
    "idf.notificationSilentMode",
    workspaceFolder
  ) as boolean;
  const showTaskOutput = isSilentMode
    ? TaskRevealKind.Always
    : TaskRevealKind.Silent;
  const saveDefConfigPresentationOptions = {
    reveal: showTaskOutput,
    showReuseMessage: false,
    clear: false,
    panel: TaskPanelKind.Shared,
  } as TaskPresentationOptions;
  const curWorkspaceFolder = workspace.workspaceFolders.find(
    (w) => w.uri === workspaceFolder
  );
  const saveDefSdkconfig = await getSaveDefConfigExecution(
    idfPath,
    workspaceFolder
  );
  TaskManager.addTask(
    {
      type: "esp-idf",
      command: "ESP-IDF: Save Default SDKCONFIG",
      taskId: "idf-defconfig-task",
    },
    curWorkspaceFolder || TaskScope.Workspace,
    "Save Default SDKCONFIG",
    saveDefSdkconfig,
    ["espIdf"],
    saveDefConfigPresentationOptions
  );
  await TaskManager.runTasks();
  if (cancelToken && !cancelToken.isCancellationRequested) {
    Logger.infoNotify("def-config has been generated");
  }
  TaskManager.disposeListeners();
}

export async function getSaveDefConfigExecution(
  idfPath: string,
  wsFolder: Uri
) {
  const saveDefConfArgs = [join(idfPath, "tools", "idf.py"), "save-defconfig"];
  const modifiedEnv = appendIdfAndToolsToPath(wsFolder);
  const options: ProcessExecutionOptions = {
    cwd: wsFolder.fsPath,
    env: modifiedEnv,
  };
  const pythonBinPath = readParameter("idf.pythonBinPath", wsFolder) as string;
  const pythonBinExists = await pathExists(pythonBinPath);
  if (!pythonBinExists) {
    throw new Error(
      `idf.pythonBinPath doesn't exist. Configure the extension first.`
    );
  }
  return new ProcessExecution(pythonBinPath, saveDefConfArgs, options);
}
