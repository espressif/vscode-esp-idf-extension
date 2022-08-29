/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 30th June 2021 9:47:52 pm
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

import { constants } from "fs";
import { pathExists, readdir } from "fs-extra";
import { join } from "path";
import {
  CancellationToken,
  ProcessExecution,
  ProcessExecutionOptions,
  TaskPanelKind,
  TaskPresentationOptions,
  TaskRevealKind,
  TaskScope,
  Uri,
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
  flasherArgsJsonPath: string
) {
  if (!canAccessFile(esptoolPath, constants.R_OK)) {
    throw new Error("SCRIPT_PERMISSION_ERROR");
  }
  const buildDirExists = await pathExists(buildDirPath);
  if (!buildDirExists) {
    throw new Error(`Build folder doesn't exist. Build first.`);
  }

  const buildFiles = await readdir(buildDirPath);
  const binFiles = buildFiles.filter(
    (fileName) => fileName.endsWith(".bin") === true
  );
  if (binFiles.length === 0) {
    throw new Error(`Build is required, .bin files can't be accessed`);
  }
  const flasherArgsJsonExists = await pathExists(flasherArgsJsonPath);
  if (!flasherArgsJsonExists) {
    throw new Error(
      "flasher_args.json file is missing from the build directory, can't proceed, please build properly!!"
    );
  }
}

export async function mergeFlashBinaries(
  wsFolder: Uri,
  cancelToken?: CancellationToken
) {
  if (cancelToken) {
    cancelToken.onCancellationRequested(() => {
      TaskManager.cancelTasks();
      TaskManager.disposeListeners();
    });
  }
  const idfPath = readParameter("idf.espIdfPath", wsFolder);
  const port = readParameter("idf.port", wsFolder);
  const flashBaudRate = readParameter("idf.flashBaudRate", wsFolder);
  const buildDirPath = readParameter(
    "idf.buildDirectoryName",
    wsFolder
  ) as string;
  const flasherArgsJsonPath = join(buildDirPath, "flasher_args.json");
  const esptoolPath = join(
    idfPath,
    "components",
    "esptool_py",
    "esptool",
    "esptool.py"
  );
  await validateReqs(buildDirPath, esptoolPath, flasherArgsJsonPath);

  const flashModel = await createFlashModel(
    flasherArgsJsonPath,
    port,
    flashBaudRate
  );

  for (const flashFile of flashModel.flashSections) {
    if (
      !canAccessFile(join(buildDirPath, flashFile.binFilePath), constants.R_OK)
    ) {
      throw new Error("SECTION_BIN_FILE_NOT_ACCESSIBLE");
    }
  }

  const isSilentMode = readParameter("idf.notificationSilentMode", wsFolder) as boolean;
  const showTaskOutput = isSilentMode
    ? TaskRevealKind.Always
    : TaskRevealKind.Silent;
  const mergeExecution = await getMergeExecution(
    buildDirPath,
    esptoolPath,
    flashModel,
    wsFolder
  );
  const mergePresentationOptions = {
    reveal: showTaskOutput,
    showReuseMessage: false,
    clear: false,
    panel: TaskPanelKind.Shared,
  } as TaskPresentationOptions;
  TaskManager.addTask(
    {
      type: "esp-idf",
      command: "Merge flash binaries",
      taskId: "idf-mergeBin-task",
    },
    TaskScope.Workspace,
    "Merge flash binaries",
    mergeExecution,
    ["espIdf"],
    mergePresentationOptions
  );
  await TaskManager.runTasks();
  if (cancelToken && !cancelToken.isCancellationRequested) {
    Logger.infoNotify("Merge binaries task is done ⚡️");
  }
  TaskManager.disposeListeners();
}

export async function getMergeExecution(
  buildDir: string,
  esptoolPath: string,
  model: FlashModel,
  wsFolder: Uri
) {
  const modifiedEnv = appendIdfAndToolsToPath(wsFolder);
  const mergeArgs = getMergeArgs(esptoolPath, model);
  const options: ProcessExecutionOptions = {
    cwd: buildDir,
    env: modifiedEnv,
  };
  const pythonBinPath = readParameter("idf.pythonBinPath", wsFolder) as string;
  const pythonBinExists = await pathExists(pythonBinPath);
  if (!pythonBinExists) {
    throw new Error(
      `idf.pythonBinPath doesn't exist. Configure the extension first.`
    );
  }
  return new ProcessExecution(pythonBinPath, mergeArgs, options);
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
