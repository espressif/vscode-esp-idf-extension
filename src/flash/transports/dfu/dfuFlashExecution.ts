/*
 * Project: ESP-IDF VSCode Extension
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

import { Uri } from "vscode";
import { FlashModel } from "../uart/types/flashModel";
import { addProcessTask } from "../../../taskManager";
import { resolveEsptoolInvocation } from "../../shared/esptool/resolveEsptoolInvocation";
import { dfuFlashingArgs } from "./getDFUArgs";
import { assertFlashSectionsReadable } from "../../shared/verifyFlashBins";

export async function createDfuFlashProcessTask(
  workspace: Uri,
  buildDirPath: string,
  model: FlashModel,
  modifiedEnv: { [key: string]: string },
  captureOutput?: boolean
) {
  assertFlashSectionsReadable(buildDirPath, model);
  const { pythonPath: pythonBinPath } =
    await resolveEsptoolInvocation(modifiedEnv["IDF_PATH"]!);
  const dfuResult = await dfuFlashingArgs(
    pythonBinPath,
    modifiedEnv,
    model.chip,
    buildDirPath
  );
  if (!dfuResult) {
    throw new Error("NO_DFU_DEVICE_SELECTED");
  }
  return addProcessTask(
    "Flash",
    workspace,
    dfuResult.cmdToUse,
    dfuResult.args,
    buildDirPath,
    modifiedEnv,
    { captureOutput }
  );
}
