/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 30th April 2021 9:26:11 pm
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

import { BuildTask } from "./buildTask";
import { BuildSession } from "./buildSession";
import { FlashSession } from "../flash/shared/flashSession";
import { EraseFlashSession } from "../eraseFlash/eraseFlashSession";
import { Logger } from "../common/logger";
import {
  buildTerminated,
  idfTaskInProgress,
  IdfTaskName,
} from "../common/error/knownError";
import { ErrorPresentation } from "../common/error/types";
import { TaskManager, throwCapturedTaskFailure } from "../taskManager/taskManager";
import { updateIdfComponentsTree } from "../configuration/workspace";
import { CustomTask, CustomTaskType } from "../taskManager/customTaskProvider";
import { ESP } from "../config";
import { OutputChannel } from "../common/outputChannel";
import { CustomExecutionTaskResult } from "../taskManager/types";
import { buildFinishFlashCmd } from "./buildFinishFlashCmd";
import { appendDfuExecution } from "./dfuExecution";
import { runSizeTaskIfEnabled } from "./sizeExecution";
import { CancellationToken, Disposable, Uri } from "vscode";

const buildIdfTaskInProgressPresentation: ErrorPresentation = {
  userMessage: "Wait for ESP-IDF {taskName} to finish before building.",
  logMessage: "Attempted to build while {taskName} is in progress.",
};

/**
 * Runs the ESP-IDF build pipeline: optional pre/post custom tasks, CMake/ninja
 * build via {@link BuildTask}, optional size report, and when {@link ESP.FlashType}
 * is DFU may append a DFU image generation step.
 *
 * @returns A {@link CustomExecutionTaskResult}: `continueFlag` is whether the
 * build path succeeded.
 *
 * @throws {KnownError} On validation failures, concurrent build/flash conflicts,
 * task failures, or user cancellation. Callers that need a soft failure result
 * should catch {@link isKnownError} and map to `{ continueFlag: false }`.
 */
export async function buildMain(
  workspace: Uri,
  cancelToken: CancellationToken,
  flashType: ESP.FlashType,
  buildType?: ESP.BuildType
): Promise<CustomExecutionTaskResult> {
  const buildTask = new BuildTask(workspace);
  const customTask = new CustomTask(workspace);
  let cancelSubscription: Disposable | undefined;
  let failure: unknown;
  let session: BuildSession | undefined;

  try {
    if (FlashSession.isActive) {
      throw idfTaskInProgress(
        IdfTaskName.Flash,
        buildIdfTaskInProgressPresentation
      );
    }
    if (EraseFlashSession.isActive) {
      throw idfTaskInProgress(
        IdfTaskName.EraseFlash,
        buildIdfTaskInProgressPresentation
      );
    }
    session = BuildSession.acquire();
    TaskManager.clearTaskResults();
    cancelSubscription = cancelToken.onCancellationRequested(() => {
      TaskManager.cancelTasks();
    });
    await customTask.addCustomTask(CustomTaskType.PreBuild);
    await buildTask.build(buildType);

    if (flashType === ESP.FlashType.DFU) {
      await appendDfuExecution(workspace);
    }
    await customTask.addCustomTask(CustomTaskType.PostBuild);
    const buildResult = await TaskManager.runTasksWithBoolean();
    let sizeResult = true;
    if (buildResult && typeof buildType === "undefined") {
      sizeResult = await runSizeTaskIfEnabled(workspace);
    }
    if (!buildResult || !sizeResult) {
      await throwCapturedTaskFailure();
    }
    if (cancelToken.isCancellationRequested && !(buildResult && sizeResult)) {
      throw buildTerminated();
    }
    if (!(buildResult && sizeResult)) {
      return { continueFlag: false };
    }
    if (!cancelToken.isCancellationRequested) {
      updateIdfComponentsTree(workspace);
      Logger.infoNotify("Build Successful");
      const flashCmd = await buildFinishFlashCmd(workspace);
      if (flashCmd) {
        OutputChannel.appendLine(flashCmd, "Build");
      }
      for (const result of TaskManager.getTaskResults()) {
        OutputChannel.appendLine(result.output.stdout, "Build");
      }
    }
    return { continueFlag: true };
  } catch (error) {
    failure = error;
  } finally {
    cancelSubscription?.dispose();
    session?.end();
  }

  if (failure !== undefined) {
    throw failure;
  }
  return { continueFlag: true };
}
