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
import { addProcessTask } from "../../../taskManager/taskManager";
import { ESP } from "../../../config";
import { resolveEsptoolLaunchStyle } from "../../shared/esptool/esptoolCli";
import { resolveEsptoolInvocation } from "../../shared/esptool/resolveEsptoolInvocation";
import { getFlasherArgs, getSingleBinFlasherArgs } from "./flashArgsBuilder";
import { assertFlashSectionsReadable } from "../../shared/verifyFlashBins";
import { flashTaskEpilogue } from "../../shared/flashTaskEpilogue";
import {
  existingFlashedReferences,
  fastReflashArgs,
  fastReflashBinPaths,
  saveFlashedBinCopies,
} from "../../shared/esptool/fastReflash";

export async function createUartFlashProcessTask(
  workspace: Uri,
  model: FlashModel,
  modifiedEnv: { [key: string]: string },
  buildDirPath: string,
  encryptPartitions: boolean,
  partitionToUse?: ESP.PartitionType
) {
  assertFlashSectionsReadable(buildDirPath, model);
  const {
    pythonPath: pythonBinPath,
    esptoolScriptPath,
  } = await resolveEsptoolInvocation(modifiedEnv["IDF_PATH"]!);
  const launchStyle = await resolveEsptoolLaunchStyle(pythonBinPath);
  const flasherArgs = partitionToUse
    ? getSingleBinFlasherArgs(
        model,
        esptoolScriptPath,
        partitionToUse,
        false,
        launchStyle.hyphenCli,
        launchStyle.useModule
      )
    : getFlasherArgs(
        model,
        esptoolScriptPath,
        encryptPartitions,
        false,
        launchStyle.hyphenCli,
        launchStyle.useModule
      );
  const binPaths = fastReflashBinPaths(flasherArgs, launchStyle.fastReflash);
  const existingRefs = await existingFlashedReferences(buildDirPath, binPaths);
  flasherArgs.push(
    ...fastReflashArgs(binPaths, (refPath) => existingRefs.has(refPath))
  );
  return addProcessTask(
    "Flash",
    workspace,
    pythonBinPath,
    flasherArgs,
    buildDirPath,
    modifiedEnv,
    {
      epilogue: async () => {
        await saveFlashedBinCopies(buildDirPath, binPaths);
        return flashTaskEpilogue();
      },
    }
  );
}
