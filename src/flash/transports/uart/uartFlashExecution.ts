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
import { FlashModel } from "./types/flashModel";
import { addProcessTask } from "../../../taskManager";
import { ESP } from "../../../config";
import { resolveEsptoolInvocation } from "../../shared/esptool/resolveEsptoolInvocation";
import {
  getFlasherArgs,
  getSingleBinFlasherArgs,
} from "./flashArgsBuilder";
import { FlashSession } from "../../shared/flashSession";
import { assertFlashSectionsReadable } from "../../shared/verifyFlashBins";

export async function createUartFlashProcessTask(
  workspace: Uri,
  model: FlashModel,
  modifiedEnv: { [key: string]: string },
  buildDirPath: string,
  encryptPartitions: boolean,
  partitionToUse?: ESP.BuildType,
  captureOutput?: boolean
) {
  if (FlashSession.isFlashing) {
    throw new Error("ALREADY_FLASHING");
  }
  FlashSession.isFlashing = true;
  try {
    assertFlashSectionsReadable(buildDirPath, model);
    const { pythonPath: pythonBinPath, esptoolScriptPath } =
      await resolveEsptoolInvocation(modifiedEnv["IDF_PATH"]!);
    const flasherArgs = partitionToUse
      ? getSingleBinFlasherArgs(model, esptoolScriptPath, partitionToUse)
      : getFlasherArgs(model, esptoolScriptPath, encryptPartitions);
    return addProcessTask(
      "Flash",
      workspace,
      pythonBinPath,
      flasherArgs,
      buildDirPath,
      modifiedEnv,
      { captureOutput }
    );
  } catch (error) {
    FlashSession.isFlashing = false;
    throw error;
  }
}
