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
import * as path from "path";
import { constants } from "fs";
import { join } from "path";
import * as vscode from "vscode";
import * as idfConf from "../idfConfiguration";
import { FlashModel } from "./types/flashModel";
import { canAccessFile } from "../utils";
import { addProcessTask } from "../taskManager";
import { getDfuList, selectDfuDevice, selectedDFUAdapterId } from "./dfu";
import { ESP } from "../config";
import { getVirtualEnvPythonPath } from "../pythonManager";
import { configureEnvVariables } from "../common/prepareEnv";
import {
  getFlasherArgs,
  getSingleBinFlasherArgs,
} from "./uart/flashArgsBuilder";

export class FlashTask {
  public static isFlashing: boolean;
  private flashScriptPath: string;
  private buildDirPath: string;

  constructor(
    private currentWorkspace: vscode.Uri,
    idfPath: string,
    private model: FlashModel,
    private encryptPartitions: boolean
  ) {
    this.flashScriptPath = join(
      idfPath,
      "components",
      "esptool_py",
      "esptool",
      "esptool.py"
    );
    this.buildDirPath = idfConf.readParameter(
      "idf.buildPath",
      currentWorkspace
    ) as string;
  }

  public flashing(flag: boolean) {
    FlashTask.isFlashing = flag;
  }

  private verifyArgs() {
    if (!canAccessFile(this.flashScriptPath, constants.R_OK, "esptool.py")) {
      throw new Error("SCRIPT_PERMISSION_ERROR");
    }
    for (const flashFile of this.model.flashSections) {
      if (
        !canAccessFile(
          join(this.buildDirPath, flashFile.binFilePath),
          constants.R_OK,
          flashFile.binFilePath
        )
      ) {
        throw new Error("SECTION_BIN_FILE_NOT_ACCESSIBLE");
      }
    }
  }

  public async flash(
    flashType: ESP.FlashType,
    partitionToUse?: ESP.BuildType,
    captureOutput?: boolean
  ) {
    if (FlashTask.isFlashing) {
      throw new Error("ALREADY_FLASHING");
    }
    this.verifyArgs();
    const pythonBinPath = await getVirtualEnvPythonPath();
    if (!pythonBinPath) {
      throw new Error("Python path not found in environment");
    }
    let processCmd = pythonBinPath;
    const modifiedEnv = await configureEnvVariables(this.currentWorkspace);
    let flasherArgs: string[] = [];
    this.flashing(true);
    switch (flashType) {
      case "UART":
        if (partitionToUse) {
          flasherArgs = getSingleBinFlasherArgs(
            this.model,
            this.flashScriptPath,
            partitionToUse
          );
        } else {
          flasherArgs = getFlasherArgs(
            this.model,
            this.flashScriptPath,
            this.encryptPartitions
          );
        }
        break;
      case "DFU":
        const dfuResult = await this.dfuFlashingArgs(
          pythonBinPath,
          modifiedEnv["IDF_PATH"]
        );
        if (!dfuResult) {
          throw new Error("DFU device selection failed");
        }
        processCmd = dfuResult.cmdToUse;
        flasherArgs = dfuResult.args;
        break;
      default:
        break;
    }
    const flashExecution = addProcessTask(
      "Flash",
      this.currentWorkspace,
      processCmd,
      flasherArgs,
      this.buildDirPath,
      modifiedEnv,
      { captureOutput }
    );
    return flashExecution;
  }

  public async dfuFlashingArgs(pythonBinPath: string, idfPath: string) {
    this.flashing(true);
    const listDfuDevices = (await getDfuList(
      this.currentWorkspace
    )) as string[];
    let cmd: string;
    let args: string[] = [];
    if (listDfuDevices.length > 0) {
      const selectedDfuPath = await selectDfuDevice(listDfuDevices);
      if (!selectedDfuPath) {
        return;
      }
      cmd = pythonBinPath;
      const idfPy = path.join(idfPath, "tools", "idf.py");
      args = [idfPy, "dfu-flash", "--path", selectedDfuPath];
    } else {
      cmd = "dfu-util";
      args = [
        "-d",
        `303a:${selectedDFUAdapterId(this.model.chip).toString(16)}`,
        "-D",
        join(this.buildDirPath, "dfu.bin"),
      ];
    }
    return { cmdToUse: cmd, args };
  }
}
