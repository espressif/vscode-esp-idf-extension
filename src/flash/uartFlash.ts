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
import { readdir } from "fs-extra";
import { join } from "path";
import { CancellationToken, Uri } from "vscode";
import { Logger } from "../logger/logger";
import { TaskManager } from "../taskManager";
import { FlashTask } from "./flashTask";
import { createFlashModel } from "./flashModelBuilder";
import { CustomTask, CustomTaskType } from "../customTasks/customTaskProvider";
import { readParameter } from "../idfConfiguration";
import { ESP } from "../config";
import { OutputChannel } from "../logger/outputChannel";

export async function uartFlashCommandMain(
  cancelToken: CancellationToken,
  flashBaudRate: string,
  idfPathDir: string,
  port: string,
  workspace: Uri,
  flashType: ESP.FlashType,
  encryptPartitions: boolean,
  partitionToUse?: ESP.BuildType
) {
  const buildPath = readParameter("idf.buildPath", workspace) as string;
  const buildFiles = await readdir(buildPath);
  const binFiles = buildFiles.filter(
    (fileName) => fileName.endsWith(".bin") === true
  );
  if (binFiles.length === 0) {
    const errStr = `Build is required before Flashing, .bin file can't be accessed`;
    OutputChannel.show();
    OutputChannel.appendLineAndShow(errStr, "Flash");
    Logger.errorNotify(
      errStr,
      new Error("BIN_FILE_ACCESS_ERROR"),
      "flashCommand binfile access error"
    );
    return false;
  }
  const flasherArgsJsonPath = join(buildPath, "flasher_args.json");
  cancelToken.onCancellationRequested(() => {
    TaskManager.cancelTasks();
    TaskManager.disposeListeners();
  });
  const model = await createFlashModel(
    flasherArgsJsonPath,
    port,
    flashBaudRate
  );
  let flashTask = new FlashTask(
    workspace,
    idfPathDir,
    model,
    encryptPartitions
  );
  const customTask = new CustomTask(workspace);
  cancelToken.onCancellationRequested(() => {
    FlashTask.isFlashing = false;
  });
  await customTask.addCustomTask(CustomTaskType.PreFlash);
  await flashTask.flash(flashType, partitionToUse);
  await customTask.addCustomTask(CustomTaskType.PostFlash);
  await TaskManager.runTasks();
  if (!cancelToken.isCancellationRequested) {
    FlashTask.isFlashing = false;
    const msg = "Flash Done ⚡️";
    OutputChannel.appendLineAndShow(msg, "Flash");
    Logger.infoNotify(msg);
  }
  TaskManager.disposeListeners();
}

export async function flashCommand(
  cancelToken: CancellationToken,
  flashBaudRate: string,
  idfPathDir: string,
  port: string,
  workspace: Uri,
  flashType: ESP.FlashType,
  encryptPartitions: boolean,
  partitionToUse?: ESP.BuildType
) {
  let continueFlag = true;
  try {
    await uartFlashCommandMain(
      cancelToken,
      flashBaudRate,
      idfPathDir,
      port,
      workspace,
      flashType,
      encryptPartitions,
      partitionToUse
    );
  } catch (error) {
    if (error.message === "ALREADY_FLASHING") {
      const errStr = "Already one flash process is running!";
      OutputChannel.appendLineAndShow(errStr, "Flash");
      Logger.errorNotify(errStr, error, "flashCommand already flashing");
      return false;
    } else if (error.message === "NO_DFU_DEVICE_SELECTED") {
      const errStr = "No DFU was selected";
      OutputChannel.appendLineAndShow(errStr, "Flash");
      Logger.infoNotify(errStr);
    } else if (error.message === "Task ESP-IDF Flash exited with code 74") {
      const errStr = "No DFU capable USB device available found";
      OutputChannel.appendLineAndShow(errStr, "Flash");
      Logger.errorNotify(
        errStr,
        error,
        "flashCommand code 74 no dfu device found"
      );
    } else if (error.message === "FLASH_TERMINATED") {
      const errStr = "Flashing has been stopped!";
      OutputChannel.appendLineAndShow(errStr, "Flash");
      Logger.errorNotify(errStr, error, "flashCommand flash terminated");
    } else if (error.message === "SECTION_BIN_FILE_NOT_ACCESSIBLE") {
      const errStr = "Flash (.bin) files don't exists or can't be accessed!";
      OutputChannel.appendLineAndShow(errStr, "Flash");
      Logger.errorNotify(
        errStr,
        error,
        "flashCommand section bin file access error"
      );
    } else if (
      error.code === "ENOENT" ||
      error.message === "SCRIPT_PERMISSION_ERROR"
    ) {
      const errStr = `Make sure you have the esptool.py installed and set in $PATH with proper permission`;
      OutputChannel.appendLineAndShow(errStr, "Flash");
      Logger.errorNotify(errStr, error, "flashCommand esptool.py access error");
    } else {
      const errStr = `Failed to flash because of some unusual error. Check Terminal for more details`;
      OutputChannel.appendLine(errStr, "Flash");
      Logger.errorNotify(
        errStr,
        error,
        "flashCommand unknown error",
        undefined,
        false
      );
    }
    continueFlag = false;
  }
  FlashTask.isFlashing = false;
  return continueFlag;
}
