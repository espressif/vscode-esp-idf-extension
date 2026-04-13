/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 26th November 2025 11:34:53 am
 * Copyright 2025 Espressif Systems (Shanghai) CO LTD
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

import { CancellationToken, l10n, Uri } from "vscode";
import { readParameter, readSerialPort } from "../idfConfiguration";
import { ESP } from "../config";
import {
  checkFlashEncryption,
  FlashCheckResultType,
} from "./verify/flashEncryption";
import { Logger } from "../logger/logger";
import { getIdfTargetFromSdkconfig } from "../workspaceConfig";
import { verifyCanFlash } from "./verify/canFlash";
import { OpenOCDManager } from "../espIdf/openOcd/openOcdManager";
import { jtagFlashCommand } from "./jtag/jtagCmd";
import { flashCommand } from "./uart/uartFlash";
import { configureEnvVariables } from "../common/prepareEnv";
import { PreCheck } from "../common/PreCheck";
import { selectFlashMethod } from "./selectFlashMethod";
import { interruptMonitorWithDelay } from "../espIdf/monitor/interruptMonitorWithDelay";

export { selectFlashMethod } from "./selectFlashMethod";

export async function startFlashing(
  workspaceFolderUri: Uri,
  cancelToken: CancellationToken,
  flashType: ESP.FlashType,
  encryptPartitions: boolean,
  partitionToUse?: ESP.BuildType
): Promise<boolean> {
  if (!flashType) {
    flashType = await selectFlashMethod(workspaceFolderUri);
  }

  await interruptMonitorWithDelay(workspaceFolderUri);

  if (encryptPartitions) {
    const encryptionValidationResult = await checkFlashEncryption(
      flashType,
      workspaceFolderUri
    );
    if (!encryptionValidationResult.success) {
      if (
        encryptionValidationResult.resultType ===
        FlashCheckResultType.ErrorEfuseNotSet
      ) {
        encryptPartitions = false;
      } else {
        return false;
      }
    }
  }

  const port = await readSerialPort(workspaceFolderUri, false);
  if (!port) {
    Logger.warnNotify(
      l10n.t(
        "No serial port found for current IDF_TARGET: {0}",
        await getIdfTargetFromSdkconfig(workspaceFolderUri)
      )
    );
    return false;
  }
  const flashBaudRate = readParameter("idf.flashBaudRate", workspaceFolderUri);
  const canFlash = await verifyCanFlash(
    flashBaudRate,
    port,
    flashType,
    workspaceFolderUri
  );
  if (!canFlash) {
    return false;
  }

  if (flashType === ESP.FlashType.JTAG) {
    const openOCDManager = OpenOCDManager.init();
    const currOpenOcdVersion = await openOCDManager.version();
    const openOCDVersionIsValid = PreCheck.openOCDVersionValidator(
      "v0.10.0-esp32-20201125",
      currOpenOcdVersion
    );
    if (!openOCDVersionIsValid) {
      Logger.infoNotify(
        `Minimum OpenOCD version v0.10.0-esp32-20201125 is required while you have ${currOpenOcdVersion} version installed`
      );
      return false;
    }
    return await jtagFlashCommand(workspaceFolderUri);
  } else {
    const modifiedEnv = await configureEnvVariables(workspaceFolderUri);
    const idfPath = modifiedEnv["IDF_PATH"];
    return await flashCommand(
      cancelToken,
      flashBaudRate,
      idfPath,
      port,
      workspaceFolderUri,
      flashType,
      encryptPartitions,
      partitionToUse
    );
  }
}
