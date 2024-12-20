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
import { FlashModel } from "./flashModel";
import { appendIdfAndToolsToPath, canAccessFile } from "../utils";
import { TaskManager } from "../taskManager";
import { getDfuList, selectDfuDevice, selectedDFUAdapterId } from "./dfu";
import { ESP } from "../config";
import { getVirtualEnvPythonPath } from "../pythonManager";

export class FlashTask {
  public static isFlashing: boolean;
  private currentWorkspace: vscode.Uri;
  private flashScriptPath: string;
  private model: FlashModel;
  private buildDirPath: string;
  private encryptPartitions: boolean;
  private idfPathDir: string;
  private modifiedEnv: { [key: string]: string };
  private processOptions: vscode.ProcessExecutionOptions;

  constructor(
    workspaceUri: vscode.Uri,
    idfPath: string,
    model: FlashModel,
    encryptPartitions: boolean
  ) {
    this.currentWorkspace = workspaceUri;
    this.flashScriptPath = join(
      idfPath,
      "components",
      "esptool_py",
      "esptool",
      "esptool.py"
    );
    this.model = model;
    this.buildDirPath = idfConf.readParameter(
      "idf.buildPath",
      workspaceUri
    ) as string;
    this.encryptPartitions = encryptPartitions;
    const customExtraVars = idfConf.readParameter(
      "idf.customExtraVars",
      workspaceUri
    ) as { [key: string]: string };
    this.idfPathDir = customExtraVars["IDF_PATH"];
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
          join(this.buildDirPath, flashFile.binFilePath),
          constants.R_OK
        )
      ) {
        throw new Error("SECTION_BIN_FILE_NOT_ACCESSIBLE");
      }
    }
  }

  public async flash(flashType: ESP.FlashType) {
    if (FlashTask.isFlashing) {
      throw new Error("ALREADY_FLASHING");
    }
    this.verifyArgs();
    const notificationMode = idfConf.readParameter(
      "idf.notificationMode",
      this.currentWorkspace
    ) as string;
    const pythonBinPath = await getVirtualEnvPythonPath(this.currentWorkspace);
    const currentWorkspaceFolder = vscode.workspace.workspaceFolders.find(
      (w) => w.uri === this.currentWorkspace
    );
    const showTaskOutput =
      notificationMode === idfConf.NotificationMode.All ||
      notificationMode === idfConf.NotificationMode.Output
        ? vscode.TaskRevealKind.Always
        : vscode.TaskRevealKind.Silent;
    let flashExecution: vscode.ProcessExecution;
    this.modifiedEnv = await appendIdfAndToolsToPath(this.currentWorkspace);
    this.processOptions = {
      cwd: this.buildDirPath,
      env: this.modifiedEnv,
    };
    switch (flashType) {
      case "UART":
        flashExecution = this._flashExecution(pythonBinPath);
        break;
      case "DFU":
        flashExecution = await this._dfuFlashing(pythonBinPath);
        break;
      default:
        break;
    }
    const flashPresentationOptions = {
      reveal: showTaskOutput,
      showReuseMessage: false,
      clear: false,
      panel: vscode.TaskPanelKind.Shared,
    } as vscode.TaskPresentationOptions;
    TaskManager.addTask(
      { type: "esp-idf", command: "ESP-IDF Flash", taskId: "idf-flash-task" },
      currentWorkspaceFolder || vscode.TaskScope.Workspace,
      "ESP-IDF Flash",
      flashExecution,
      ["espIdf"],
      flashPresentationOptions
    );
  }

  public _flashExecution(pythonBinPath: string) {
    this.flashing(true);
    const flasherArgs = this.getFlasherArgs(this.flashScriptPath);
    return new vscode.ProcessExecution(
      pythonBinPath,
      flasherArgs,
      this.processOptions
    );
  }

  public async _dfuFlashing(pythonBinPath: string) {
    this.flashing(true);
    const listDfuDevices = (await getDfuList(
      this.currentWorkspace
    )) as string[];
    let cmd: string;
    let args: string[] = [];
    if (listDfuDevices.length > 0) {
      const selectedDfuPath = await selectDfuDevice(listDfuDevices);
      if (!selectDfuDevice) {
        return;
      }
      cmd = pythonBinPath;
      const idfPy = path.join(this.idfPathDir, "tools", "idf.py");
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
    return new vscode.ProcessExecution(cmd, args, this.processOptions);
  }

  public getFlasherArgs(toolPath: string, replacePathSep: boolean = false) {
    const flasherArgs = [
      toolPath,
      "-p",
      this.model.port,
      "-b",
      this.model.baudRate,
      "--before",
      this.model.before,
      "--after",
      this.model.after,
    ];
    if (this.model.chip) {
      flasherArgs.push("--chip", this.model.chip);
    }
    if (typeof this.model.stub !== undefined && !this.model.stub) {
      flasherArgs.push("--no-stub");
    }
    flasherArgs.push(
      "write_flash",
      "--flash_mode",
      this.model.mode,
      "--flash_freq",
      this.model.frequency,
      "--flash_size",
      this.model.size
    );
    const encryptedFlashSections = this.model.flashSections.filter(
      (flashSection) => flashSection.encrypted
    );
    if (
      this.encryptPartitions &&
      encryptedFlashSections &&
      encryptedFlashSections.length
    ) {
      if (
        this.model.flashSections &&
        this.model.flashSections.length === encryptedFlashSections.length
      ) {
        flasherArgs.push("--encrypt");
      } else {
        flasherArgs.push("--encrypt-files");
        for (const flashFile of encryptedFlashSections) {
          let binPath = replacePathSep
            ? flashFile.binFilePath.replace(/\//g, "\\")
            : flashFile.binFilePath;
          flasherArgs.push(flashFile.address, binPath);
        }
      }
    }
    for (const flashFile of this.model.flashSections) {
      let binPath = replacePathSep
        ? flashFile.binFilePath.replace(/\//g, "\\")
        : flashFile.binFilePath;
      flasherArgs.push(flashFile.address, binPath);
    }

    return flasherArgs;
  }
}
