/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 30th April 2021 9:26:11 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { BuildTask } from "./buildTask";
import { FlashTask } from "../flash/flashTask";
import { LocDictionary } from "../localizationDictionary";
import * as vscode from "vscode";
import { Logger } from "../logger/logger";
import { TaskManager } from "../taskManager";
import { join } from "path";
import { updateIdfComponentsTree } from "../workspaceConfig";

const locDic = new LocDictionary(__filename);

export async function buildCommand(
  workspace: vscode.Uri,
  cancelToken: vscode.CancellationToken
) {
  const buildTask = new BuildTask(workspace.fsPath);
  if (BuildTask.isBuilding || FlashTask.isFlashing) {
    const waitProcessIsFinishedMsg = locDic.localize(
      "extension.waitProcessIsFinishedMessage",
      "Wait for ESP-IDF build or flash to finish"
    );
    Logger.errorNotify(
      waitProcessIsFinishedMsg,
      new Error("One_Task_At_A_Time")
    );
    return;
  }
  cancelToken.onCancellationRequested(() => {
    TaskManager.cancelTasks();
    TaskManager.disposeListeners();
    buildTask.building(false);
  });
  try {
    await buildTask.build();
    await TaskManager.runTasks();
    if (!cancelToken.isCancellationRequested) {
      buildTask.building(false);
      const projDescPath = join(
        workspace.fsPath,
        "build",
        "project_description.json"
      );
      updateIdfComponentsTree(projDescPath);
      Logger.infoNotify("Build Successfully");
      TaskManager.disposeListeners();
    }
  } catch (error) {
    if (error.message === "ALREADY_BUILDING") {
      return Logger.errorNotify("Already a build is running!", error);
    }
    if (error.message === "BUILD_TERMINATED") {
      return Logger.warnNotify(`Build is Terminated`);
    }
    Logger.errorNotify(
      "Something went wrong while trying to build the project",
      error
    );
    buildTask.building(false);
  }
}
