/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 27th September 2019 9:59:57 pm
 * Copyright 2019 Espressif Systems (Shanghai) CO LTD
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
import * as vscode from "vscode";
import * as idfConf from "../idfConfiguration";
import { FlashModel } from "./flashModel";
import { appendIdfAndToolsToPath, canAccessFile } from "../utils";
import { TaskManager } from "../taskManager";
import { SpawnOptions } from "child_process";
import EspIdfCustomTerminal from "../espIdfCustomTerminal";

export class FlashTask {
  public static isFlashing: boolean;
  private buildDir: string;
  private flashScriptPath: string;
  private model: FlashModel;

  constructor(buildDir: string, idfPath: string, model: FlashModel) {
    this.buildDir = buildDir;
    this.flashScriptPath = join(
      idfPath,
      "components",
      "esptool_py",
      "esptool",
      "esptool.py"
    );
    this.model = model;
  }

  public flashing(flag: boolean) {
    FlashTask.isFlashing = flag;
  }

  private verifyArgs() {
    if (!canAccessFile(this.flashScriptPath, constants.R_OK)) {
      throw new Error("SCRIPT_PERMISSION_ERROR");
    }
    for (const flashFile of this.model.flashSections) {
      if (
        !canAccessFile(
          join(this.buildDir, flashFile.binFilePath),
          constants.R_OK
        )
      ) {
        throw new Error("SECTION_BIN_FILE_NOT_ACCESSIBLE");
      }
    }
  }

  public async flash() {
    if (FlashTask.isFlashing) {
      throw new Error("ALREADY_FLASHING");
    }
    this.verifyArgs();
    const flashExecution = this._flashExecution();
    const isSilentMode = idfConf.readParameter("idf.notificationSilentMode");
    const showTaskOutput = isSilentMode
      ? vscode.TaskRevealKind.Silent
      : vscode.TaskRevealKind.Always;
    TaskManager.addTask(
      { type: "esp-idf", command: "ESP-IDF Flash" },
      vscode.TaskScope.Workspace,
      "ESP-IDF Flash",
      flashExecution,
      ["idfRelative", "idfAbsolute"],
      showTaskOutput
    );
  }

  public _flashExecution() {
    this.flashing(true);
    const modifiedEnv = appendIdfAndToolsToPath();
    const flasherArgs = [
      this.flashScriptPath,
      "-p",
      this.model.port,
      "-b",
      this.model.baudRate,
      "--after",
      "hard_reset",
      "write_flash",
      "--flash_mode",
      this.model.mode,
      "--flash_freq",
      this.model.frequency,
      "--flash_size",
      this.model.size,
    ];
    for (const flashFile of this.model.flashSections) {
      flasherArgs.push(flashFile.address, flashFile.binFilePath);
    }
    const options: SpawnOptions = {
      cwd: this.buildDir,
      env: modifiedEnv,
    };
    const pythonBinPath = idfConf.readParameter("idf.pythonBinPath") as string;
    return new vscode.CustomExecution(
      async () => new EspIdfCustomTerminal(pythonBinPath, flasherArgs, options)
    );
  }
}
