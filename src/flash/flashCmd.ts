/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 30th April 2021 10:25:57 pm
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

import { ensureDir, pathExists } from "fs-extra";
import * as cp from "child_process";
import { join } from "path";
import * as idfConf from "../idfConfiguration";
import * as vscode from "vscode";
import { FlashTask } from "./flashTask";
import {
  selectedDFUAdapterId,
  isBinInPath,
  execChildProcess,
  appendIdfAndToolsToPath,
  listAvailableDfuDevices,
} from "../utils";
import { getDfuList } from "../extension";
import { BuildTask } from "../build/buildTask";
import { LocDictionary } from "../localizationDictionary";
import { Logger } from "../logger/logger";
import { getProjectName } from "../workspaceConfig";

const locDic = new LocDictionary(__filename);

export async function verifyCanFlash(
  flashBaudRate: string,
  port: string,
  workspace: vscode.Uri
) {
  let continueFlag = true;
  if (BuildTask.isBuilding || FlashTask.isFlashing) {
    const waitProcessIsFinishedMsg = locDic.localize(
      "flash.waitProcessIsFinishedMessage",
      "Wait for ESP-IDF task to finish"
    );
    return Logger.errorNotify(
      waitProcessIsFinishedMsg,
      new Error("One_Task_At_A_Time")
    );
  }

  const buildPath = join(workspace.fsPath, "build");
  if (!(await pathExists(buildPath))) {
    return Logger.errorNotify(
      `Build is required before Flashing, ${buildPath} can't be accessed`,
      new Error("BUILD_PATH_ACCESS_ERROR")
    );
  }
  if (!(await pathExists(join(buildPath, "flasher_args.json")))) {
    return Logger.warnNotify(
      "flasher_args.json file is missing from the build directory, can't proceed, please build properly!!"
    );
  }
  const projectName = await getProjectName(workspace.fsPath);
  if (!(await pathExists(join(buildPath, `${projectName}.elf`)))) {
    return Logger.warnNotify(
      `Can't proceed with flashing, since project elf file (${projectName}.elf) is missing from the build dir. (${buildPath})`
    );
  }
  if (!port) {
    try {
      await vscode.commands.executeCommand("espIdf.selectPort");
    } catch (error) {
      Logger.error("Unable to execute the command: espIdf.selectPort", error);
    }
    return Logger.errorNotify(
      "Select a serial port before flashing",
      new Error("NOT_SELECTED_PORT")
    );
  }
  if (!flashBaudRate) {
    return Logger.errorNotify(
      "Select a baud rate before flashing",
      new Error("NOT_SELECTED_BAUD_RATE")
    );
  }
  const selectedFlashType = idfConf.readParameter("idf.flashType");
  if (selectedFlashType === "DFU") {
    const data = await getDfuList();
    const listDfu = await listAvailableDfuDevices(data);
    if (!listDfu) {
      return Logger.errorNotify(
        "No DFU capable USB device available found",
        new Error("NO_DFU_DEVICES_FOUND")
      );
    }
  }
  return continueFlag;
}

export async function selectDfuDevice(arrDfuDevices) {
  const target = idfConf.readParameter("idf.saveScope");
  let selectedDfuDevice = await vscode.window.showQuickPick(arrDfuDevices, {
    ignoreFocusOut: true,
    placeHolder: "Select one of the available devices from the list",
  });

  if (selectedDfuDevice) {
    const regex = new RegExp(/path="[0-9]+-(^[1-9][0-9]?$|^100$)+"/g);
    const pathValue = selectedDfuDevice.match(regex)[0].slice(6, -1);

    await idfConf.writeParameter(
      "idf.selectedDfuDevicePath",
      pathValue,
      target
    );
  } else {
    await idfConf.writeParameter("idf.selectedDfuDevicePath", "", target);
  }
}
