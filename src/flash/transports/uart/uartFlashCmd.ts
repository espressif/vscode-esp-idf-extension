/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 6th May 2021 2:13:33 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
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
import { join } from "path";
import { CancellationToken, Disposable, Uri } from "vscode";
import { Logger } from "../../../logger/logger";
import {
  collectExecutions,
  TaskManager,
  throwCapturedTaskFailure,
} from "../../../taskManager";
import { createUartFlashProcessTask } from "./uartFlashExecution";
import { createDfuFlashProcessTask } from "../dfu/dfuFlashExecution";
import { createFlashModel } from "./flashModelBuilder";
import {
  CustomTask,
  CustomTaskType,
} from "../../../customTasks/customTaskProvider";
import { ESP } from "../../../config";
import { OutputChannel } from "../../../logger/outputChannel";
import { CustomExecutionTaskResult } from "../../../taskManager/customExecution";
import { FlashSession } from "../../shared/flashSession";

export async function uartFlashCommandMain(
  cancelToken: CancellationToken,
  flashBaudRate: string,
  port: string,
  workspace: Uri,
  modifiedEnv: { [key: string]: string },
  buildDirPath: string,
  flashType: ESP.FlashType,
  encryptPartitions: boolean,
  partitionToUse?: ESP.BuildType,
  captureOutput?: boolean
): Promise<CustomExecutionTaskResult> {
  const flasherArgsJsonPath = join(buildDirPath, "flasher_args.json");
  if (FlashSession.isFlashing) {
    throw new Error("ALREADY_FLASHING");
  }
  let ownsFlashSession = false;
  let cancelSubscription: Disposable | undefined;
  try {
    FlashSession.isFlashing = true;
    ownsFlashSession = true;
    cancelSubscription = cancelToken.onCancellationRequested(() => {
      if (!ownsFlashSession) {
        return;
      }
      TaskManager.cancelTasks();
      FlashSession.isFlashing = false;
    });
    const model = await createFlashModel(
      flasherArgsJsonPath,
      port,
      flashBaudRate
    );
    const customTask = new CustomTask(workspace);
    const preFlashExecution = await customTask.addCustomTask(
      CustomTaskType.PreFlash,
      captureOutput
    );
    const flashExecution =
      flashType === ESP.FlashType.DFU
        ? await createDfuFlashProcessTask(
            workspace,
            buildDirPath,
            model,
            modifiedEnv,
            captureOutput
          )
        : await createUartFlashProcessTask(
            workspace,
            model,
            modifiedEnv,
            buildDirPath,
            encryptPartitions,
            partitionToUse,
            captureOutput
          );
    const postFlashExecution = await customTask.addCustomTask(
      CustomTaskType.PostFlash,
      captureOutput
    );
    const flashResult = await TaskManager.runTasksWithBoolean();

    if (!cancelToken.isCancellationRequested && flashResult) {
      const msg = "Flash Done ⚡️";
      OutputChannel.appendLineAndShow(msg, "Flash");
      Logger.infoNotify(msg);
    }
    return {
      continueFlag: flashResult,
      executions: collectExecutions(
        preFlashExecution,
        flashExecution,
        postFlashExecution
      ),
    };
  } finally {
    cancelSubscription?.dispose();
    if (ownsFlashSession) {
      FlashSession.isFlashing = false;
    }
    TaskManager.disposeListeners();
  }
}
