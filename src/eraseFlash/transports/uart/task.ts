/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 27th September 2019 9:59:57 pm
 * Copyright 2019 Espressif Systems (Shanghai) CO LTD
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
import { resolveEsptoolInvocation } from "../../../flash/shared/esptool/resolveEsptoolInvocation";
import { addProcessTask } from "../../../taskManager/taskManager";
import { buildUartEraseFlashArgs } from "./eraseFlashUartArgs";
import { getCurrentIdfConfiguration } from "../../../configuration/env";

export async function createEraseFlashProcessTask(
  workspace: Uri,
  port: string
) {
  const modifiedEnv = getCurrentIdfConfiguration();
  const {
    pythonPath: pythonBinPath,
    esptoolScriptPath,
  } = await resolveEsptoolInvocation(modifiedEnv["IDF_PATH"]);
  const args = buildUartEraseFlashArgs(esptoolScriptPath, port);
  return addProcessTask(
    "Erase Flash",
    workspace,
    pythonBinPath,
    args,
    workspace.fsPath || process.cwd(),
    modifiedEnv
  );
}
