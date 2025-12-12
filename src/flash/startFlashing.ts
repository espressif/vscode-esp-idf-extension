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

import {
  CancellationToken,
  ConfigurationTarget,
  l10n,
  Uri,
  window,
} from "vscode";
import {
  readParameter,
  readSerialPort,
  writeParameter,
} from "../idfConfiguration";
import { ESP } from "../config";
import { IDFMonitor } from "../espIdf/monitor";
import { PreCheck, sleep } from "../utils";
import {
  checkFlashEncryption,
  FlashCheckResultType,
} from "./verifyFlashEncryption";
import { Logger } from "../logger/logger";
import { getIdfTargetFromSdkconfig } from "../workspaceConfig";
import { verifyCanFlash } from "./flashCmd";
import { OpenOCDManager } from "../espIdf/openOcd/openOcdManager";
import { jtagFlashCommand } from "./jtagCmd";
import { flashCommand } from "./uartFlash";

export async function selectFlashMethod(workspaceFolderUri: Uri) {
  let curflashType = readParameter(
    "idf.flashType",
    workspaceFolderUri
  ) as ESP.FlashType;
  let newFlashType = (await window.showQuickPick(Object.keys(ESP.FlashType), {
    ignoreFocusOut: true,
    placeHolder: l10n.t(
      "Select flash method, you can modify the choice later from 'settings.json' (idf.flashType)"
    ),
  })) as ESP.FlashType;
  if (!newFlashType) {
    return curflashType;
  }
  await writeParameter(
    "idf.flashType",
    newFlashType,
    ConfigurationTarget.WorkspaceFolder,
    workspaceFolderUri
  );
  window.showInformationMessage(`Flash method changed to ${newFlashType}.`);
  return newFlashType;
}

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

  if (IDFMonitor.terminal) {
    IDFMonitor.terminal.sendText(ESP.CTRL_RBRACKET);
    const monitorDelay = readParameter(
      "idf.monitorDelay",
      workspaceFolderUri
    ) as number;
    await sleep(monitorDelay);
  }

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
        return;
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
      return;
    }
    return await jtagFlashCommand(workspaceFolderUri);
  } else {
    const idfPathDir = readParameter(
      "idf.espIdfPath",
      workspaceFolderUri
    ) as string;
    return await flashCommand(
      cancelToken,
      flashBaudRate,
      idfPathDir,
      port,
      workspaceFolderUri,
      flashType,
      encryptPartitions,
      partitionToUse
    );
  }
}
