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

import { CancellationToken, Disposable, Uri, workspace } from "vscode";
import { readParameter, readSerialPort } from "../configuration/idf";
import { ESP } from "../config";
import {
  checkFlashEncryption,
  throwIfFlashEncryptionCheckFailed,
} from "./verify/flashEncryption";
import { getIdfTargetFromSdkconfig } from "../configuration/workspace";
import { verifyCanFlash } from "./verify/canFlash";
import { jtagFlashCommandMain } from "./transports/jtag/jtagCmd";
import { uartFlashCommandMain } from "./transports/uart/uartFlashCmd";
import { interruptMonitorWithDelay } from "../espIdf/monitor/interruptMonitorWithDelay";
import { ensureFlashTypeForTask } from "./resolveFlashContext";
import { TaskManager } from "../taskManager/taskManager";
import { CustomExecutionTaskResult } from "../taskManager/types";
import { FlashSession } from "./shared/flashSession";
import { getCurrentIdfConfiguration } from "../configuration/env";
import { BuildSession } from "../build/buildSession";
import {
  flashTerminated,
  idfTaskInProgress,
  IdfTaskName,
  noSerialPort,
} from "../common/error/knownError";
import { throwFlashCapturedTaskFailure } from "./shared/flashTaskFailure";
import { assertMinimumOpenOcdVersionForJtag } from "../espIdf/openOcd/jtagPreflight";
import { EraseFlashSession } from "../eraseFlash/eraseFlashSession";
import { flashJtagOpenOcdPresentation } from "./jtagOpenOcdPresentation";
export { selectFlashMethod } from "./selectFlashMethod";

/**
 * Runs the ESP-IDF flash pipeline for UART, DFU, or JTAG transports.
 *
 * @returns A {@link CustomExecutionTaskResult}: `continueFlag` is whether the
 * flash path succeeded; `executions` collects task executions for follow-up
 * checks or {@link throwFlashCapturedTaskFailure}.
 *
 * @throws {KnownError} On validation failures, concurrent build/flash conflicts,
 * task failures, or user cancellation. Callers that need a soft failure result
 * should catch {@link isKnownError} and map to `{ continueFlag: false }`.
 */
export async function flashMain(
  workspaceFolderUri: Uri,
  cancelToken: CancellationToken,
  flashTypeIn: ESP.FlashType | undefined,
  encryptPartitions: boolean,
  partitionToUse?: ESP.BuildType,
  captureOutput?: boolean
): Promise<CustomExecutionTaskResult> {
  const wsFolder =
    workspace.getWorkspaceFolder(workspaceFolderUri) ??
    ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
  const flashType = await ensureFlashTypeForTask(wsFolder, flashTypeIn);
  let session: FlashSession | undefined;
  let cancelSubscription: Disposable | undefined;
  let failure: unknown;
  let flashCmdResult: CustomExecutionTaskResult = {
    continueFlag: false,
    executions: [],
  };

  try {
    await interruptMonitorWithDelay(workspaceFolderUri);

    if (encryptPartitions) {
      const encryptionValidationResult = await checkFlashEncryption(
        flashType,
        workspaceFolderUri
      );
      if (
        !throwIfFlashEncryptionCheckFailed(encryptionValidationResult)
      ) {
        encryptPartitions = false;
      }
    }

    let port = "";
    if (flashType === ESP.FlashType.UART) {
      const uartPort = await readSerialPort(workspaceFolderUri, false);
      if (!uartPort) {
        throw noSerialPort(await getIdfTargetFromSdkconfig(workspaceFolderUri));
      }
      port = uartPort;
    }
    const buildDirPath = readParameter(
      "idf.buildPath",
      workspaceFolderUri
    ) as string;
    const flashBaudRate = readParameter(
      "idf.flashBaudRate",
      workspaceFolderUri
    ) as string;
    const modifiedEnv = getCurrentIdfConfiguration();
    await verifyCanFlash(
      flashBaudRate,
      port,
      flashType,
      modifiedEnv,
      buildDirPath,
      workspaceFolderUri
    );

    if (flashType === ESP.FlashType.JTAG) {
      await assertMinimumOpenOcdVersionForJtag(
        flashJtagOpenOcdPresentation.versionTooLow
      );
      if (BuildSession.isActive) {
        throw idfTaskInProgress(IdfTaskName.Build);
      }
      if (EraseFlashSession.isActive) {
        throw idfTaskInProgress(IdfTaskName.EraseFlash);
      }
      session = FlashSession.acquire();
      TaskManager.clearTaskResults();
      cancelSubscription = cancelToken.onCancellationRequested(() => {
        TaskManager.cancelTasks();
      });
      flashCmdResult = await jtagFlashCommandMain(
        cancelToken,
        workspaceFolderUri,
        buildDirPath
      );
    } else {
      if (BuildSession.isActive) {
        throw idfTaskInProgress(IdfTaskName.Build);
      }
      if (EraseFlashSession.isActive) {
        throw idfTaskInProgress(IdfTaskName.EraseFlash);
      }
      session = FlashSession.acquire();
      TaskManager.clearTaskResults();
      cancelSubscription = cancelToken.onCancellationRequested(() => {
        TaskManager.cancelTasks();
      });
      flashCmdResult = await uartFlashCommandMain(
        cancelToken,
        flashBaudRate,
        port,
        workspaceFolderUri,
        modifiedEnv,
        buildDirPath,
        flashType,
        encryptPartitions,
        partitionToUse,
        captureOutput
      );
    }

    if (!flashCmdResult.continueFlag) {
      await throwFlashCapturedTaskFailure(flashCmdResult.executions);
    }
    if (
      cancelToken.isCancellationRequested &&
      !flashCmdResult.continueFlag
    ) {
      throw flashTerminated();
    }
    if (!flashCmdResult.continueFlag) {
      return { continueFlag: false, executions: flashCmdResult.executions };
    }
    return flashCmdResult;
  } catch (error) {
    failure = error;
  } finally {
    cancelSubscription?.dispose();
    session?.end();
  }

  if (failure !== undefined) {
    throw failure;
  }
  return flashCmdResult;
}
