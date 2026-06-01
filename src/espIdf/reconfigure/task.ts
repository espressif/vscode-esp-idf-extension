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

import { Uri } from "vscode";
import { join } from "path";
import { addProcessTask } from "../../taskManager";
import { getVirtualEnvPythonPath } from "../../pythonManager";
import { configureEnvVariables } from "../../common/prepareEnv";
import { buildIdfPyConfigSubcommandArgs } from "../common/idfPySubCmdBuilder";

export async function addIdfReconfigureTask(workspace: Uri) {
  const modifiedEnv = await configureEnvVariables(workspace);
  const idfPy = join(modifiedEnv["IDF_PATH"], "tools", "idf.py");
  const reconfigureArgs = buildIdfPyConfigSubcommandArgs(
    idfPy,
    "reconfigure",
    workspace
  );

  const pythonBinPath = getVirtualEnvPythonPath();

  if (!pythonBinPath) {
    return;
  }

  addProcessTask(
    "Reconfigure",
    workspace,
    pythonBinPath,
    reconfigureArgs,
    workspace.fsPath,
    modifiedEnv
  );
}
