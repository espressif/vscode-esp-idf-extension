/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 2nd December 2021 3:17:19 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
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
  ShellExecution,
  ShellExecutionOptions,
  TaskRevealKind,
  TaskScope,
  Uri,
} from "vscode";
import { readParameter } from "../idfConfiguration";
import { TaskManager } from "../taskManager";
import { appendIdfAndToolsToPath } from "../utils";

export enum CustomTaskType {
  Custom = "custom",
  PreBuild = "prebuild",
  PostBuild = "postbuild",
  PreFlash = "preflash",
  PostFlash = "postflash",
}

export class CustomTask {
  public static isRunningCustomTask: boolean;

  constructor(private currentWorkspace: Uri) {}

  public isRunning(flag: boolean) {
    CustomTask.isRunningCustomTask = flag;
  }

  public getProcessExecution(
    cmdString: string,
    options: ShellExecutionOptions
  ) {
    return new ShellExecution(`${cmdString}`, options);
  }

  public addCustomTask(taskType: CustomTaskType) {
    let cmd: string;
    let taskName: string;
    switch (taskType) {
      case CustomTaskType.PreBuild:
        cmd = readParameter("idf.preBuildTask", this.currentWorkspace);
        taskName = "Pre Build";
        break;
      case CustomTaskType.PostBuild:
        cmd = readParameter("idf.postBuildTask", this.currentWorkspace);
        taskName = "Post Build";
        break;
      case CustomTaskType.PreFlash:
        cmd = readParameter("idf.preFlashTask", this.currentWorkspace);
        taskName = "Pre Flash";
        break;
      case CustomTaskType.PostFlash:
        cmd = readParameter("idf.postFlashTask", this.currentWorkspace);
        taskName = "Post Flash";
        break;
      case CustomTaskType.Custom:
        cmd = readParameter("idf.customTask", this.currentWorkspace);
        taskName = "Custom task";
      default:
        break;
    }
    if (!cmd) {
      return;
    }
    const modifiedEnv = appendIdfAndToolsToPath(this.currentWorkspace);
    const options: ShellExecutionOptions = {
      cwd: this.currentWorkspace.fsPath,
      env: modifiedEnv,
    };
    const isSilentMode = readParameter(
      "idf.notificationSilentMode",
      this.currentWorkspace
    ) as boolean;
    const showTaskOutput = isSilentMode
      ? TaskRevealKind.Always
      : TaskRevealKind.Silent;
    const customExecution = this.getProcessExecution(cmd, options);
    TaskManager.addTask(
      {
        type: "esp-idf",
        command: `ESP-IDF ${taskName}`,
        taskId: `idf-${taskType}-task`,
      },
      TaskScope.Workspace,
      `ESP-IDF ${taskName}`,
      customExecution,
      ["idfRelative", "idfAbsolute"],
      showTaskOutput
    );
  }

  public async runTasks(taskType: CustomTaskType) {
    let cmd: string;
    switch (taskType) {
      case CustomTaskType.PreBuild:
        cmd = readParameter(
          "idf.preBuildTask",
          this.currentWorkspace
        ) as string;
        break;
      case CustomTaskType.PostBuild:
        cmd = readParameter(
          "idf.postBuildTask",
          this.currentWorkspace
        ) as string;
        break;
      case CustomTaskType.PreFlash:
        cmd = readParameter(
          "idf.preFlashTask",
          this.currentWorkspace
        ) as string;
        break;
      case CustomTaskType.PostFlash:
        cmd = readParameter(
          "idf.postFlashTask",
          this.currentWorkspace
        ) as string;
        break;
      case CustomTaskType.Custom:
        cmd = readParameter("idf.customTask", this.currentWorkspace) as string;
      default:
        break;
    }
    if (cmd) {
      await TaskManager.runTasks();
    }
  }
}
