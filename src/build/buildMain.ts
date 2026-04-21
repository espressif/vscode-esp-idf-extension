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
import { FlashTask } from "../flash/flashTask";
import { Logger } from "../logger/logger";
import {
  collectExecutions,
  TaskManager,
  throwCapturedTaskFailure,
} from "../taskManager";
import { updateIdfComponentsTree } from "../workspaceConfig";
import { CustomTask, CustomTaskType } from "../customTasks/customTaskProvider";
import { ESP } from "../config";
import { OutputChannel } from "../logger/outputChannel";
import { CustomExecutionTaskResult } from "../taskManager/customExecution";
import { buildFinishFlashCmd } from "./buildFinishFlashCmd";
import { cleanupBuildState } from "./buildHelpers";
import { appendDfuExecution } from "./dfuExecution";
import { runSizeTaskIfEnabled } from "./sizeExecution";
import { CancellationToken, l10n, Uri } from "vscode";

/**
 * Build the project with the given parameters.
 *
 * It will build the project, run the size task, and if flashType is DFU, it will append the DFU execution.
 *
 * @param workspace - The workspace folder URI
 * @param cancelToken - The cancellation token
 * @param flashType - The flash type
 * @param buildType - The build type
 * @returns true if the build is successful, false otherwise
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

  try {
    if (BuildTask.isBuilding || FlashTask.isFlashing) {
      const waitProcessIsFinishedMsg = l10n.t(
        "Wait for ESP-IDF build or flash to finish"
      );
      Logger.errorNotify(
        waitProcessIsFinishedMsg,
        new Error("One_Task_At_A_Time"),
        "buildCmd buildCommand"
      );
      return { continueFlag: false, executions };
    }
    cancelToken.onCancellationRequested(() => {
      TaskManager.cancelTasks();
      BuildTask.isBuilding = false;
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
        buildTask,
        captureOutput
      ))
    ) {
      cleanupBuildState(buildTask);
      await throwCapturedTaskFailure(executions);
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
    if (buildResult && !cancelToken.isCancellationRequested) {
      updateIdfComponentsTree(workspace);
      Logger.infoNotify("Build Successful");
      const flashCmd = await buildFinishFlashCmd(workspace);
      if (flashCmd) {
        OutputChannel.appendLine(flashCmd, "Build");
      }
    }
    cleanupBuildState(buildTask);

    return {
      continueFlag: buildResult && sizeResult,
      executions,
    };
  } catch (error) {
    cleanupBuildState(buildTask);
    if (error instanceof Error && error.message === "ALREADY_BUILDING") {
      Logger.errorNotify("Already a build is running!", error, "buildCommand");
    }
    if (error instanceof Error && error.message === "BUILD_TERMINATED") {
      Logger.warnNotify("Build is Terminated");
    } else {
      Logger.errorNotify(
        "Something went wrong while trying to build the project",
        error instanceof Error ? error : new Error(String(error)),
        "buildCommand",
        undefined,
        false
      );
    }
    return { continueFlag: false, executions };
  }
}
