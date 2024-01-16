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
import { OutputChannel } from "../logger/outputChannel";
import * as utils from "../utils";
import { ESPEFuseManager } from "../efuse";
import { getDocsUrl } from "../espIdf/documentation/getDocsVersion";

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
    OutputChannel.show();
    OutputChannel.appendLineAndShow(waitProcessIsFinishedMsg, "Flash");
    return Logger.errorNotify(
      waitProcessIsFinishedMsg,
      new Error("One_Task_At_A_Time")
    );
  }

  const buildPath = idfConf.readParameter(
    "idf.buildPath",
    workspace
  ) as string;
  if (!(await pathExists(buildPath))) {
    const errStr = `Build is required before Flashing, ${buildPath} can't be accessed`;
    OutputChannel.show();
    OutputChannel.appendLineAndShow(errStr, "Flash");
    return Logger.errorNotify(
      errStr,
      new Error("BUILD_PATH_ACCESS_ERROR")
    );
  }
  if (!(await pathExists(join(buildPath, "flasher_args.json")))) {
    const errStr = "flasher_args.json file is missing from the build directory, can't proceed, please build properly!";
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
  if (!port) {
    try {
      await vscode.commands.executeCommand("espIdf.selectPort");
    } catch (error) {
      const errStr = "Unable to execute the command: espIdf.selectPort";
      OutputChannel.show();
      OutputChannel.appendLineAndShow(errStr, "Flash");
      Logger.error(errStr, error);
    }
    const errStr = "Select a port before flashing";
    OutputChannel.show();
    OutputChannel.appendLineAndShow(errStr, "Flash");
    return Logger.errorNotify(
      errStr,
      new Error("NOT_SELECTED_PORT")
    );
  }
  if (!flashBaudRate) {
    const errStr = "Select a baud rate before flashing";
    OutputChannel.show();
    OutputChannel.appendLineAndShow(errStr, "Flash");
    return Logger.errorNotify(
      errStr,
      new Error("NOT_SELECTED_BAUD_RATE")
    );
  }
  const selectedFlashType = idfConf.readParameter("idf.flashType", workspace) as ESP.FlashType;
  if (selectedFlashType === ESP.FlashType.DFU) {
    const data = await getDfuList(workspace);
    const listDfu = await listAvailableDfuDevices(data);
    if (!listDfu) {
      const errStr = "No DFU capable USB device available found";
      OutputChannel.show();
      OutputChannel.appendLineAndShow(errStr, "Flash");
      return Logger.errorNotify(
        errStr,
        new Error("NO_DFU_DEVICES_FOUND")
      );
    }
  }
  return continueFlag;
}

export function isFlashEncryptionEnabled(workspaceRoot: vscode.Uri) {
  const flashEncryption = utils.getConfigValueFromSDKConfig(
    "CONFIG_FLASH_ENCRYPTION_ENABLED",
    workspaceRoot
  );
  return flashEncryption === "y";
}

export async function checkFlashEncryption(
  encryptPartitions: boolean,
  flashType: ESP.FlashType,
  workspaceRoot: vscode.Uri
) {
  Logger.info(`Using flash type: ${flashType}`, { tag: "Flash" });

  try {
    if (encryptPartitions) {
      if (flashType !== ESP.FlashType.UART) {
        throw new Error(
          `Invalid flash type for partition encryption. Required: UART, Found: ${flashType}`
        );
      }
      const eFuse = new ESPEFuseManager(workspaceRoot);
      const summaryResult = await eFuse.readSummary();
      if (summaryResult && summaryResult.BLOCK_KEY0) {
        if (
          summaryResult.BLOCK_KEY0.value &&
          summaryResult.BLOCK_KEY0.value ===
            "00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00"
        ) {
          const errorMessage =
            "Encryption key (eFuse BLOCK_KEY0) is not set. Please configure the eFuse key before proceeding with encrypted flashing.";
          const error = new Error(errorMessage);
          const documentationUrl = await getDocsUrl(
            ESP.URL.Docs.FLASH_ENCRYPTION,
            workspaceRoot
          );
          utils.showErrorNotificationWithLink(errorMessage, documentationUrl);
          OutputChannel.appendLineAndShow(error.message);
          Logger.error(errorMessage, error, { tag: "FLASH_ENCRYPTION" });
          return;
        }
      }
    }
  } catch (error) {
    OutputChannel.appendLineAndShow(error.message);
    Logger.errorNotify(error.message, error, { tag: "FLASH_ENCRYPTION" });
    return;
  }
}
