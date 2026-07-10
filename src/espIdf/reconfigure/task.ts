/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 22nd May 2024 4:45:50 pm
 * Copyright 2024 Espressif Systems (Shanghai) CO LTD
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

import { ExtensionContext, Uri } from "vscode";
import { join } from "path";
import { addProcessTask, TaskManager } from "../../taskManager/taskManager";
import { getCurrentIdfConfiguration, getVirtualEnvPythonPath } from "../../configuration/env";
import { buildIdfPyConfigSubcommandArgs } from "../common/idfPySubCmdBuilder";
import { withProgressWrapper } from "../../common/withProgressWrapper";
import { registerIDFCommand } from "../../common/registerCommand";
import { openFolderCheck } from "../../common/PreCheck";
import { Logger } from "../../common/logger";
import { missingDependency } from "../../common/error/knownError";
import { ESP } from "../../config";

export async function addIdfReconfigureTask(workspace: Uri) {
  const pythonBinPath = getVirtualEnvPythonPath();
  if (!pythonBinPath) {
    throw missingDependency("Python");
  }

  const modifiedEnv = getCurrentIdfConfiguration();
  const idfPy = join(modifiedEnv["IDF_PATH"], "tools", "idf.py");
  const reconfigureArgs = buildIdfPyConfigSubcommandArgs(
    idfPy,
    "reconfigure",
    workspace
  );

  addProcessTask(
    "Reconfigure",
    workspace,
    pythonBinPath,
    reconfigureArgs,
    workspace.fsPath,
    modifiedEnv
  );
}

export function registerReconfigureCmd(context: ExtensionContext) {
  registerIDFCommand(context, "espIdf.idfReconfigureTask", async () => {
    await withProgressWrapper(
      [openFolderCheck],
      "ESP-IDF: Reconfiguring ESP-IDF project",
      async (_progress, cancelToken) => {
        const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
        await addIdfReconfigureTask(wsFolder.uri);
        await TaskManager.runTasks();
        if (!cancelToken.isCancellationRequested) {
          Logger.infoNotify("ESP-IDF Reconfigure Successfully");
          TaskManager.disposeListeners();
        }
      }
    );
  });
}
