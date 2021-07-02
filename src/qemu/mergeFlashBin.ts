/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 30th June 2021 9:47:52 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { constants } from "fs";
import { pathExists, readdir } from "fs-extra";
import { join } from "path";
import {
  CancellationToken,
  ShellExecution,
  ShellExecutionOptions,
  TaskRevealKind,
  TaskScope,
} from "vscode";
import { FlashModel } from "../flash/flashModel";
import { createFlashModel } from "../flash/flashModelBuilder";
import { readParameter } from "../idfConfiguration";
import { Logger } from "../logger/logger";
import { TaskManager } from "../taskManager";
import { appendIdfAndToolsToPath, canAccessFile } from "../utils";

export async function validateReqs(
  buildDirPath: string,
  esptoolPath: string,
  flasherArgsJsonPath: string,
  flashModel: FlashModel
) {
  if (!canAccessFile(esptoolPath, constants.R_OK)) {
    throw new Error("SCRIPT_PERMISSION_ERROR");
  }
  const buildFiles = await readdir(buildDirPath);
  const binFiles = buildFiles.filter(
    (fileName) => fileName.endsWith(".bin") === true
  );
  if (binFiles.length === 0) {
    return Logger.errorNotify(
      `Build is required before merging .bin file can't be accessed`,
      new Error("BIN_FILE_ACCESS_ERROR")
    );
  }
  const flasherArgsJsonExists = await pathExists(flasherArgsJsonPath);
  if (!flasherArgsJsonExists) {
    return Logger.warnNotify(
      "flasher_args.json file is missing from the build directory, can't proceed, please build properly!!"
    );
  }
  for (const flashFile of flashModel.flashSections) {
    if (
      !canAccessFile(join(buildDirPath, flashFile.binFilePath), constants.R_OK)
    ) {
      throw new Error("SECTION_BIN_FILE_NOT_ACCESSIBLE");
    }
  }
}

export async function mergeFlashBinaries(wsFolder: string, cancelToken: CancellationToken) {
  cancelToken.onCancellationRequested(() => {
    TaskManager.cancelTasks();
    TaskManager.disposeListeners();
  });
  const idfPath = readParameter("idf.espIdfPath");
  const port = readParameter("idf.port");
  const flashBaudRate = readParameter("idf.flashBaudRate");
  const buildDir = join(wsFolder, "build");
  const flasherArgsJsonPath = join(buildDir, "flasher_args.json");
  const flashModel = await createFlashModel(
    flasherArgsJsonPath,
    port,
    flashBaudRate
  );
  const esptoolPath = join(
    idfPath,
    "components",
    "esptool_py",
    "esptool",
    "esptool.py"
  );

  await validateReqs(buildDir, esptoolPath, flasherArgsJsonPath, flashModel);

  const isSilentMode = readParameter("idf.notificationSilentMode");
  const showTaskOutput = isSilentMode
    ? TaskRevealKind.Silent
    : TaskRevealKind.Always;
  const mergeExecution: ShellExecution = getMergeExecution(
    buildDir,
    esptoolPath,
    flashModel
  );
  TaskManager.addTask(
    { type: "esp-idf", command: "Merge flash binaries" },
    TaskScope.Workspace,
    "Merge flash binaries",
    mergeExecution,
    ["idfRelative", "idfAbsolute"],
    showTaskOutput
  );
  await TaskManager.runTasks();
  if (!cancelToken.isCancellationRequested) {
    Logger.infoNotify("Merge binaries is done ⚡️");
  }
  TaskManager.disposeListeners();
}

export function getMergeExecution(
  buildDir: string,
  esptoolPath: string,
  model: FlashModel
) {
  const modifiedEnv = appendIdfAndToolsToPath();
  const mergeArgs = getMergeArgs(esptoolPath, model);
  const options: ShellExecutionOptions = {
    cwd: buildDir,
    env: modifiedEnv,
  };
  const pythonBinPath = readParameter("idf.pythonBinPath") as string;
  return new ShellExecution(`${pythonBinPath} ${mergeArgs.join(" ")}`, options);
}

export function getMergeArgs(toolPath: string, model: FlashModel) {
  const mergeArgs = [
    toolPath,
    "--chip",
    "esp32",
    "merge_bin",
    "-o",
    "merged_qemu.bin",
    "--flash_mode",
    "dout",
    "--flash_size",
    "4MB",
    "--fill-flash-size",
    "4MB",
  ];
  for (let flashFile of model.flashSections) {
    mergeArgs.push(flashFile.address, flashFile.binFilePath);
  }
  return mergeArgs;
}
