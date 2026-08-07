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

import { CancellationToken, Disposable, WorkspaceFolder } from "vscode";
import { ESP } from "../config";
import { TaskManager } from "../taskManager/taskManager";
import { selectFlashMethod } from "../flash/main";
import { isFlashEncryptionEnabled } from "../flash/verify/flashEncryption";
import { CustomExecutionTaskResult } from "../taskManager/types";
import { interruptMonitorWithDelay } from "../espIdf/monitor/interruptMonitorWithDelay";
import { Logger } from "../common/logger";
import { OutputChannel } from "../common/outputChannel";
import { jtagEraseFlashCommand } from "./transports/jtag/jtag";
import { uartEraseFlashCmd } from "./transports/uart/cmd";
import { EraseFlashSession } from "./eraseFlashSession";
import { getConfigValueFromSDKConfig } from "../configuration/workspace";
import { BuildSession } from "../build/buildSession";
import { FlashSession } from "../flash/shared/flashSession";
import {
  eraseBlockedBySecureConfig,
  eraseTerminated,
  idfTaskInProgress,
  IdfTaskName,
} from "../common/error/knownError";
import { assertMinimumOpenOcdVersionForJtag } from "../espIdf/openOcd/jtagPreflight";
import { throwEraseCapturedTaskFailure } from "./eraseTaskFailure";
import { eraseJtagOpenOcdPresentation } from "./jtagOpenOcdPresentation";

/**
 * Runs the ESP-IDF erase-flash pipeline for UART or JTAG transports.
 *
 * @throws {KnownError} On validation failures, concurrent build/flash/erase
 * conflicts, task failures, or user cancellation. Callers that need a soft
 * failure result should catch {@link isKnownError} and map to
 * `{ continueFlag: false }`.
 */
export async function eraseFlashMain(
  workspaceFolder: WorkspaceFolder,
  cancelToken: CancellationToken,
  flashType?: ESP.FlashType,
  captureOutput?: boolean
): Promise<CustomExecutionTaskResult> {
  let session: EraseFlashSession | undefined;
  let cancelSubscription: Disposable | undefined;
  let failure: unknown;
  let eraseFlashCmdResult: CustomExecutionTaskResult = {
    continueFlag: false,
    executions: [],
  };

  try {
    if (!flashType) {
      flashType = await selectFlashMethod(workspaceFolder);
    }
    await interruptMonitorWithDelay(workspaceFolder.uri);

    const isEncrypted = await isFlashEncryptionEnabled(workspaceFolder.uri);
    const secureBoot = await getConfigValueFromSDKConfig(
      "CONFIG_SECURE_BOOT",
      workspaceFolder.uri
    );
    const isSecureBootEnabled = secureBoot === "y";
    if (isEncrypted || isSecureBootEnabled) {
      throw eraseBlockedBySecureConfig();
    }

    if (BuildSession.isActive) {
      throw idfTaskInProgress(IdfTaskName.Build);
    }
    if (FlashSession.isActive) {
      throw idfTaskInProgress(IdfTaskName.Flash);
    }

    if (flashType === ESP.FlashType.JTAG) {
      await assertMinimumOpenOcdVersionForJtag(
        eraseJtagOpenOcdPresentation.versionTooLow
      );
    }

    session = EraseFlashSession.acquire();
    TaskManager.clearTaskResults();
    cancelSubscription = cancelToken.onCancellationRequested(() => {
      TaskManager.cancelTasks();
    });

    if (flashType === ESP.FlashType.JTAG) {
      OutputChannel.appendLine("Erasing flash via JTAG...", "Erase flash");
      eraseFlashCmdResult = await jtagEraseFlashCommand(
        cancelToken,
        workspaceFolder.uri
      );
      if (!eraseFlashCmdResult.continueFlag) {
        await throwEraseCapturedTaskFailure(eraseFlashCmdResult.executions);
      }
      if (eraseFlashCmdResult.continueFlag) {
        const msg =
          "JTAG erase flash finished. Check Output channel to see results.";
        OutputChannel.appendLine(msg, "Erase flash");
        Logger.infoNotify(msg);
      }
    } else {
      eraseFlashCmdResult = await uartEraseFlashCmd(
        workspaceFolder.uri,
        cancelToken,
        captureOutput
      );
      if (!eraseFlashCmdResult.continueFlag) {
        await throwEraseCapturedTaskFailure(eraseFlashCmdResult.executions);
      }
    }

    if (
      cancelToken.isCancellationRequested &&
      !eraseFlashCmdResult.continueFlag
    ) {
      throw eraseTerminated();
    }
    if (!eraseFlashCmdResult.continueFlag) {
      return {
        continueFlag: false,
        executions: eraseFlashCmdResult.executions,
      };
    }
    return eraseFlashCmdResult;
  } catch (error) {
    failure = error;
  } finally {
    cancelSubscription?.dispose();
    session?.end();
  }

  if (failure !== undefined) {
    throw failure;
  }
  return eraseFlashCmdResult;
}
