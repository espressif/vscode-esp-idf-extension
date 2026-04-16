/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 16th April 2026 5:50:18 pm
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
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
import { ESP } from "../config";
import { throwCapturedTaskFailure } from "../taskManager";
import { selectFlashMethod } from "../flash/main";
import { isFlashEncryptionEnabled } from "../flash/verify/flashEncryption";
import { CustomExecutionTaskResult } from "../taskManager/customExecution";
import { interruptMonitorWithDelay } from "../espIdf/monitor/interruptMonitorWithDelay";
import { getConfigValueFromSDKConfig } from "../utils";
import { Logger } from "../logger/logger";
import { OutputChannel } from "../logger/outputChannel";
import { jtagEraseFlashCommand } from "./transports/jtag/jtag";
import { uartEraseFlashCmd } from "./transports/uart/cmd";
import { EraseFlashSession } from "./eraseFlashSession";

export async function eraseFlashMain(
  workspaceFolderUri: Uri,
  cancelToken: CancellationToken,
  flashType?: ESP.FlashType,
  captureOutput?: boolean
): Promise<CustomExecutionTaskResult> {
  try {
    if (!flashType) {
      flashType = await selectFlashMethod(workspaceFolderUri);
    }
    await interruptMonitorWithDelay(workspaceFolderUri);
    const isEncrypted = await isFlashEncryptionEnabled(workspaceFolderUri);

    const secureBoot = await getConfigValueFromSDKConfig(
      "CONFIG_SECURE_BOOT",
      workspaceFolderUri
    );
    const isSecureBootEnabled = secureBoot === "y";
    if (isEncrypted || isSecureBootEnabled) {
      Logger.warnNotify(
        l10n.t(
          "Flash encryption or secure boot is enabled on the sdkconfig. Erasing flash will permanently remove the encryption keys and may render the device unusable."
        )
      );
      return { continueFlag: false, executions: [] };
    }
    let eraseFlashCmdResult: CustomExecutionTaskResult;
    if (flashType === ESP.FlashType.JTAG) {
      OutputChannel.appendLine("Erasing flash via JTAG...", "Erase flash");
      eraseFlashCmdResult = await jtagEraseFlashCommand(workspaceFolderUri);
      if (!eraseFlashCmdResult.continueFlag) {
        await throwCapturedTaskFailure(eraseFlashCmdResult.executions);
      }
      const msg =
        "JTAG erase flash finished. Check Output channel to see results.";
      OutputChannel.appendLine(msg, "Erase flash");
      Logger.infoNotify(msg);
    } else {
      eraseFlashCmdResult = await uartEraseFlashCmd(
        workspaceFolderUri,
        cancelToken,
        captureOutput
      );
      if (!eraseFlashCmdResult.continueFlag) {
        await throwCapturedTaskFailure(eraseFlashCmdResult.executions);
      }
    }
    return eraseFlashCmdResult;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    EraseFlashSession.isErasing = false;
    Logger.errorNotify(errMsg, error as Error, "eraseFlashCommand");
    return { continueFlag: false, executions: [] };
  }
}
