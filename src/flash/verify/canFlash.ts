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
import { commands, Uri } from "vscode";
import { BuildSession } from "../../build/buildSession";
import { FlashSession } from "../shared/flashSession";
import { Logger } from "../../common/logger";
import { pathExists } from "fs-extra";
import { join } from "path";
import { getProjectElfFilePath } from "../../configuration/workspace";
import { getDfuList } from "../transports/dfu/helpers";
import {
  alreadyBuilding,
  alreadyFlashing,
  buildRequiredBeforeFlash,
  fileNotFound,
  flasherArgsMissing,
  isKnownError,
  noBaudRateSelected,
  noDfuDeviceFound,
  noPortSelected,
} from "../../common/error/knownError";

export async function verifyCanFlash(
  flashBaudRate: string,
  port: string,
  flashType: ESP.FlashType,
  modifiedEnv: { [key: string]: string },
  buildDirPath: string,
  workspace: Uri
): Promise<void> {
  if (BuildSession.isActive) {
    throw alreadyBuilding();
  }
  if (FlashSession.isActive) {
    throw alreadyFlashing();
  }
  if (!(await pathExists(buildDirPath))) {
    throw buildRequiredBeforeFlash(buildDirPath);
  }
  if (!(await pathExists(join(buildDirPath, "flasher_args.json")))) {
    throw flasherArgsMissing();
  }
  let elfFilePath: string;
  try {
    elfFilePath = await getProjectElfFilePath(workspace);
    if (!(await pathExists(elfFilePath))) {
      throw fileNotFound(elfFilePath);
    }
  } catch (error) {
    if (isKnownError(error)) {
      throw error;
    }
    const errStr =
      error instanceof Error
        ? error.message
        : "Failed to get project ELF file path";
    Logger.error(
      errStr,
      error as Error,
      "flashCmd verifyCanFlash getProjectElfFilePath"
    );
    throw fileNotFound(errStr);
  }
  if (flashType === ESP.FlashType.UART) {
    if (!port) {
      try {
        await commands.executeCommand("espIdf.selectPort");
      } catch (error) {
        const errStr = "Unable to execute the command: espIdf.selectPort";
        Logger.error(errStr, error as Error, "verifyCanFlash selectPort");
      }
      throw noPortSelected();
    }
  }
  if (flashType === ESP.FlashType.UART && !flashBaudRate) {
    throw noBaudRateSelected();
  }
  if (flashType === ESP.FlashType.DFU) {
    const listDfu = await getDfuList(modifiedEnv);
    if (!listDfu) {
      throw noDfuDeviceFound();
    }
  }
}
