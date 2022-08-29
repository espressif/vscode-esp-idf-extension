/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 30th April 2021 10:25:57 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { pathExists } from "fs-extra";
import { join } from "path";
import * as idfConf from "../idfConfiguration";
import * as vscode from "vscode";
import { FlashTask } from "./flashTask";
import { BuildTask } from "../build/buildTask";
import { LocDictionary } from "../localizationDictionary";
import { Logger } from "../logger/logger";
import { getProjectName } from "../workspaceConfig";
import { getDfuList, listAvailableDfuDevices } from "./dfu";
import { ESP } from "../config";

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

  const buildPath = idfConf.readParameter(
    "idf.buildDirectoryName",
    workspace
  ) as string;
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
  const projectName = await getProjectName(buildPath);
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
  const selectedFlashType = idfConf.readParameter("idf.flashType", workspace) as ESP.FlashType;
  if (selectedFlashType === ESP.FlashType.DFU) {
    const data = await getDfuList(workspace);
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
