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

export async function flashCommand(
  cancelToken: CancellationToken,
  flashBaudRate: string,
  idfPathDir: string,
  port: string,
  workspace: Uri,
  flashType: ESP.FlashType,
  encryptPartitions: boolean
) {
  let continueFlag = true;
  const buildPath = readParameter(
    "idf.buildDirectoryName",
    workspace
  ) as string;
  const buildFiles = await readdir(buildPath);
  const binFiles = buildFiles.filter(
    (fileName) => fileName.endsWith(".bin") === true
  );
  if (binFiles.length === 0) {
    return Logger.errorNotify(
      `Build is required before Flashing, .bin file can't be accessed`,
      new Error("BIN_FILE_ACCESS_ERROR")
    );
  }
  const flasherArgsJsonPath = join(buildPath, "flasher_args.json");
  let flashTask: FlashTask;
  cancelToken.onCancellationRequested(() => {
    TaskManager.cancelTasks();
    TaskManager.disposeListeners();
  });
  try {
    const model = await createFlashModel(
      flasherArgsJsonPath,
      port,
      flashBaudRate
    );
    flashTask = new FlashTask(workspace, idfPathDir, model, encryptPartitions);
    const customTask = new CustomTask(workspace);
    cancelToken.onCancellationRequested(() => {
      FlashTask.isFlashing = false;
    });
    customTask.addCustomTask(CustomTaskType.PreFlash);
    await flashTask.flash(flashType);
    customTask.addCustomTask(CustomTaskType.PostFlash);
    await TaskManager.runTasks();
    if (!cancelToken.isCancellationRequested) {
      FlashTask.isFlashing = false;
      Logger.infoNotify("Flash Done ⚡️");
    }
    TaskManager.disposeListeners();
  } catch (error) {
    if (error.message === "ALREADY_FLASHING") {
      return Logger.errorNotify("Already one flash process is running!", error);
    }
    FlashTask.isFlashing = false;
    if (error.message === "Task ESP-IDF Flash exited with code 74") {
      return Logger.errorNotify(
        "No DFU capable USB device available found",
        error
      );
    }
    if (error.message === "FLASH_TERMINATED") {
      return Logger.errorNotify("Flashing has been stopped!", error);
    }
    if (error.message === "SECTION_BIN_FILE_NOT_ACCESSIBLE") {
      return Logger.errorNotify(
        "Flash (.bin) files don't exists or can't be accessed!",
        error
      );
    }
    if (
      error.code === "ENOENT" ||
      error.message === "SCRIPT_PERMISSION_ERROR"
    ) {
      return Logger.errorNotify(
        `Make sure you have the esptool.py installed and set in $PATH with proper permission`,
        error
      );
    }
    Logger.errorNotify("Failed to flash because of some unusual error", error);
    continueFlag = false;
  }
  FlashTask.isFlashing = false;
  return continueFlag;
}
