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
import { join } from "path";
import {
  ShellExecution,
  ShellExecutionOptions,
  TaskRevealKind,
  TaskScope,
} from "vscode";
import { FlashModel } from "../flash/flashModel";
import { readParameter } from "../idfConfiguration";
import { TaskManager } from "../taskManager";
import { appendIdfAndToolsToPath, canAccessFile } from "../utils";

export function mergeFlashBinaries(
  buildDir: string,
  idfPath: string,
  flashModel: FlashModel
) {
  const esptoolPath = join(
    idfPath,
    "components",
    "esptool_py",
    "esptool",
    "esptool.py"
  );

  if (!canAccessFile(esptoolPath, constants.R_OK)) {
    throw new Error("SCRIPT_PERMISSION_ERROR");
  }
  for (const flashFile of flashModel.flashSections) {
    if (!canAccessFile(join(buildDir, flashFile.binFilePath), constants.R_OK)) {
      throw new Error("SECTION_BIN_FILE_NOT_ACCESSIBLE");
    }
  }
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
  return new ShellExecution(
    `${pythonBinPath} ${mergeArgs.join(" ")}`,
    options
  );
}

export function getMergeArgs(toolPath: string, model: FlashModel) {
  const mergeArgs = [
    toolPath,
    "--chip",
    "esp32",
    "merge_bin",
    "-o",
    "merged_flash.bin",
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
