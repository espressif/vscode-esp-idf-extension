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
import { Logger } from "../logger/logger";
import { getProjectName } from "../workspaceConfig";
import { getDfuList } from "./dfu";
import { ESP } from "../config";
import { OutputChannel } from "../logger/outputChannel";

export async function verifyCanFlash(
  flashBaudRate: string,
  port: string,
  flashType: ESP.FlashType,
  workspace: vscode.Uri
) {
  let continueFlag = true;
  if (BuildTask.isBuilding || FlashTask.isFlashing) {
    const waitProcessIsFinishedMsg = vscode.l10n.t(
      "Wait for ESP-IDF task to finish"
    );
    OutputChannel.show();
    OutputChannel.appendLineAndShow(waitProcessIsFinishedMsg, "Flash");
    return Logger.errorNotify(
      waitProcessIsFinishedMsg,
      new Error("One_Task_At_A_Time"),
      "flashCmd verifyCanFlash already build flash task running"
    );
  }

  const buildPath = idfConf.readParameter("idf.buildPath", workspace) as string;
  if (!(await pathExists(buildPath))) {
    const errStr = `Build is required before Flashing, ${buildPath} can't be accessed`;
    OutputChannel.show();
    OutputChannel.appendLineAndShow(errStr, "Flash");
    return Logger.errorNotify(errStr, new Error("BUILD_PATH_ACCESS_ERROR"),
    "flashCmd verifyCanFlash build path doesnt exist");
  }
  if (!(await pathExists(join(buildPath, "flasher_args.json")))) {
    const errStr =
      "flasher_args.json file is missing from the build directory, can't proceed, please build properly!";
    OutputChannel.show();
    OutputChannel.appendLineAndShow(errStr, "Flash");
    return Logger.warnNotify(errStr);
  }
  const projectName = await getProjectName(buildPath);
  if (!(await pathExists(join(buildPath, `${projectName}.elf`)))) {
    const errStr = `Can't proceed with flashing, since project elf file (${projectName}.elf) is missing from the build dir. (${buildPath})`;
    OutputChannel.show();
    OutputChannel.appendLineAndShow(errStr, "Flash");
    return Logger.warnNotify(errStr);
  }
  if(flashType !== "JTAG") {
    if (!port) {
      try {
        await vscode.commands.executeCommand("espIdf.selectPort");
      } catch (error) {
        const errStr = "Unable to execute the command: espIdf.selectPort";
        OutputChannel.show();
        OutputChannel.appendLineAndShow(errStr, "Flash");
        Logger.error(errStr, error, "verifyCanFlash selectPort");
      }
      const errStr = "Select a port before flashing";
      OutputChannel.show();
      OutputChannel.appendLineAndShow(errStr, "Flash");
      return Logger.errorNotify(errStr, new Error("NOT_SELECTED_PORT"),
      "flashCmd verifyCanFlash select port");
    }
  }
  if (!flashBaudRate) {
    const errStr = "Select a baud rate before flashing";
    OutputChannel.show();
    OutputChannel.appendLineAndShow(errStr, "Flash");
    return Logger.errorNotify(errStr, new Error("NOT_SELECTED_BAUD_RATE"),
    "flashCmd verifyCanFlash no flashbaudrate");
  }
  const selectedFlashType = idfConf.readParameter(
    "idf.flashType",
    workspace
  ) as ESP.FlashType;
  if (selectedFlashType === ESP.FlashType.DFU) {
    const listDfu = await getDfuList(workspace);
    if (!listDfu) {
      const errStr = "No DFU capable USB device available found";
      OutputChannel.show();
      OutputChannel.appendLineAndShow(errStr, "Flash");
      return Logger.errorNotify(errStr, new Error("NO_DFU_DEVICES_FOUND"),
      "flashCmd verifyCanFlash no dfu device found");
    }
  }
  return continueFlag;
}
