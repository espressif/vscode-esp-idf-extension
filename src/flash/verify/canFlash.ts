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

import { ESP } from "../../config";
import { commands, l10n, Uri } from "vscode";
import { BuildTask } from "../../build/buildTask";
import { FlashSession } from "../shared/flashSession";
import { Logger } from "../../logger/logger";
import { OutputChannel } from "../../logger/outputChannel";
import { readParameter } from "../../idfConfiguration";
import { pathExists } from "fs-extra";
import { join } from "path";
import { getProjectElfFilePath } from "../../workspaceConfig";
import { getDfuList } from "../transports/dfu/helpers";

export async function verifyCanFlash(
  flashBaudRate: string,
  port: string,
  flashType: ESP.FlashType,
  workspace: Uri,
  modifiedEnv: { [key: string]: string }
) {
  let continueFlag = true;
  if (BuildTask.isBuilding || FlashSession.isFlashing) {
    const waitProcessIsFinishedMsg = l10n.t("Wait for ESP-IDF task to finish");
    OutputChannel.show();
    OutputChannel.appendLineAndShow(waitProcessIsFinishedMsg, "Flash");
    return Logger.errorNotify(
      waitProcessIsFinishedMsg,
      new Error("One_Task_At_A_Time"),
      "flashCmd verifyCanFlash already build flash task running"
    );
  }

  const buildPath = readParameter("idf.buildPath", workspace) as string;
  if (!(await pathExists(buildPath))) {
    const errStr = `Build is required before Flashing, ${buildPath} can't be accessed`;
    OutputChannel.show();
    OutputChannel.appendLineAndShow(errStr, "Flash");
    return Logger.errorNotify(
      errStr,
      new Error("BUILD_PATH_ACCESS_ERROR"),
      "flashCmd verifyCanFlash build path doesnt exist"
    );
  }
  if (!(await pathExists(join(buildPath, "flasher_args.json")))) {
    const errStr =
      "flasher_args.json file is missing from the build directory, can't proceed, please build properly!";
    OutputChannel.show();
    OutputChannel.appendLineAndShow(errStr, "Flash");
    return Logger.warnNotify(errStr);
  }
  let elfFilePath: string;
  try {
    elfFilePath = await getProjectElfFilePath(workspace);
  } catch (error) {
    const errStr = "Failed to get project ELF file path";
    OutputChannel.show();
    OutputChannel.appendLineAndShow(errStr, "Flash");
    return Logger.errorNotify(
      errStr,
      error as Error,
      "flashCmd verifyCanFlash getProjectElfFilePath"
    );
  }
  if (!(await pathExists(elfFilePath))) {
    const errStr = `Can't proceed with flashing, since project elf file (${elfFilePath}) is missing from the build dir. (${buildPath})`;
    OutputChannel.show();
    OutputChannel.appendLineAndShow(errStr, "Flash");
    return Logger.warnNotify(errStr);
  }
  if (flashType === ESP.FlashType.UART) {
    if (!port) {
      try {
        await commands.executeCommand("espIdf.selectPort");
      } catch (error) {
        const errStr = "Unable to execute the command: espIdf.selectPort";
        OutputChannel.show();
        OutputChannel.appendLineAndShow(errStr, "Flash");
        Logger.error(errStr, error as Error, "verifyCanFlash selectPort");
      }
      const errStr = "Select a port before flashing";
      OutputChannel.show();
      OutputChannel.appendLineAndShow(errStr, "Flash");
      return Logger.errorNotify(
        errStr,
        new Error("NOT_SELECTED_PORT"),
        "flashCmd verifyCanFlash select port"
      );
    }
  }
  if (flashType === ESP.FlashType.UART && !flashBaudRate) {
    const errStr = "Select a baud rate before flashing";
    OutputChannel.show();
    OutputChannel.appendLineAndShow(errStr, "Flash");
    return Logger.errorNotify(
      errStr,
      new Error("NOT_SELECTED_BAUD_RATE"),
      "flashCmd verifyCanFlash no flashbaudrate"
    );
  }
  if (flashType === ESP.FlashType.DFU) {
    const listDfu = await getDfuList(modifiedEnv);
    if (!listDfu) {
      const errStr = "No DFU capable USB device available found";
      OutputChannel.show();
      OutputChannel.appendLineAndShow(errStr, "Flash");
      return Logger.errorNotify(
        errStr,
        new Error("NO_DFU_DEVICES_FOUND"),
        "flashCmd verifyCanFlash no dfu device found"
      );
    }
  }
  return continueFlag;
}
