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
import { Logger } from "../common/logger";
import {
  buildTerminated,
  flashInProgress,
} from "../common/error/knownError";
import {
  collectExecutions,
  TaskManager,
  throwCapturedTaskFailure,
} from "../taskManager/taskManager";
import { updateIdfComponentsTree } from "../configuration/workspace";
import { CustomTask, CustomTaskType } from "../taskManager/customTaskProvider";
import { ESP } from "../config";
import { OutputChannel } from "../common/outputChannel";
import { CustomExecutionTaskResult } from "../taskManager/types";
import { buildFinishFlashCmd } from "./buildFinishFlashCmd";
import { appendDfuExecution } from "./dfuExecution";
import { runSizeTaskIfEnabled } from "./sizeExecution";
import { CancellationToken, Disposable, Uri } from "vscode";

/**
 * Runs the ESP-IDF build pipeline: optional pre/post custom tasks, CMake/ninja
 * build via {@link BuildTask}, optional size report, and when {@link ESP.FlashType}
 * is DFU may append a DFU image generation step.
 *
 * @returns A {@link CustomExecutionTaskResult}: `continueFlag` is whether the
 * build path succeeded; `executions` collects task executions (including
 * captured output where used) for follow-up checks or
 * {@link throwCapturedTaskFailure}.
 *
 * @throws {KnownError} On validation failures, concurrent build/flash conflicts,
 * task failures, or user cancellation. Callers that need a soft failure result
 * should catch {@link isKnownError} and map to `{ continueFlag: false }`.
 */
export async function buildMain(
  workspace: Uri,
  cancelToken: CancellationToken,
  flashType: ESP.FlashType,
  buildType?: ESP.BuildType,
  captureOutput?: boolean
): Promise<CustomExecutionTaskResult> {
  const buildTask = new BuildTask(workspace);
  const customTask = new CustomTask(workspace);
  let executions = collectExecutions();
  let cancelSubscription: Disposable | undefined;
  let failure: unknown;
  let session: BuildSession | undefined;

  try {
    if (FlashSession.isFlashing) {
      throw flashInProgress();
    }
    session = BuildSession.acquire();
    TaskManager.clearTaskResults();
    cancelSubscription = cancelToken.onCancellationRequested(() => {
      TaskManager.cancelTasks();
    });
    const preBuildExecution = await customTask.addCustomTask(
      CustomTaskType.PreBuild,
      captureOutput
    );
    const [compileExecution, buildExecution] = await buildTask.build(
      buildType,
      captureOutput
    );
    executions = collectExecutions(
      preBuildExecution,
      compileExecution,
      buildExecution
    );

    if (
      flashType === ESP.FlashType.DFU &&
      !(await appendDfuExecution(
        executions,
        workspace,
        captureOutput
      ))
    ) {
      return { continueFlag: false, executions };
    }
    const postBuildExecution = await customTask.addCustomTask(
      CustomTaskType.PostBuild,
      captureOutput
    );
    executions.push(...collectExecutions(postBuildExecution));
    const buildResult = await TaskManager.runTasksWithBoolean();
    let sizeResult = true;
    if (buildResult && typeof buildType === "undefined") {
      sizeResult = await runSizeTaskIfEnabled(
        executions,
        workspace,
        captureOutput
      );
    }
    if (!buildResult || !sizeResult) {
      await throwCapturedTaskFailure(executions);
    }
    if (
      cancelToken.isCancellationRequested &&
      !(buildResult && sizeResult)
    ) {
      throw buildTerminated();
    }
    if (!(buildResult && sizeResult)) {
      return { continueFlag: false, executions };
    }
    if (!cancelToken.isCancellationRequested) {
      updateIdfComponentsTree(workspace);
      Logger.infoNotify("Build Successful");
      const flashCmd = await buildFinishFlashCmd(workspace);
      if (flashCmd) {
        OutputChannel.appendLine(flashCmd, "Build");
      }
    }
    return { continueFlag: true, executions };
  } catch (error) {
    failure = error;
  } finally {
    cancelSubscription?.dispose();
    session?.end();
  }

  if (failure !== undefined) {
    throw failure;
  }
  return { continueFlag: true, executions };
}
