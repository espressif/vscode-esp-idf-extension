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
  TaskPanelKind,
  TaskPresentationOptions,
  TaskRevealKind,
  TaskScope,
  Uri,
  workspace,
} from "vscode";
import { NotificationMode, readParameter } from "../idfConfiguration";
import { TaskManager } from "../taskManager";
import { configureEnvVariables } from "../common/prepareEnv";

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

  public async addCustomTask(taskType: CustomTaskType) {
    let command: string;
    let taskName: string;
    switch (taskType) {
      case CustomTaskType.PreBuild:
        command = readParameter("idf.preBuildTask", this.currentWorkspace);
        taskName = "Pre Build";
        break;
      case CustomTaskType.PostBuild:
        command = readParameter("idf.postBuildTask", this.currentWorkspace);
        taskName = "Post Build";
        break;
      case CustomTaskType.PreFlash:
        command = readParameter("idf.preFlashTask", this.currentWorkspace);
        taskName = "Pre Flash";
        break;
      case CustomTaskType.PostFlash:
        command = readParameter("idf.postFlashTask", this.currentWorkspace);
        taskName = "Post Flash";
        break;
      case CustomTaskType.Custom:
        command = readParameter("idf.customTask", this.currentWorkspace);
        taskName = "Custom task";
      default:
        break;
    }
    if (!command) {
      return;
    }
    const modifiedEnv = await configureEnvVariables(this.currentWorkspace);
    const options: ShellExecutionOptions = {
      cwd: this.currentWorkspace.fsPath,
      env: modifiedEnv,
    };
    const shellExecutablePath = readParameter(
      "idf.customTerminalExecutable",
      this.currentWorkspace
    ) as string;
    const shellExecutableArgs = readParameter(
      "idf.customTerminalExecutableArgs",
      this.currentWorkspace
    ) as string[];
    if (shellExecutablePath) {
      options.executable = shellExecutablePath;
    }
    if (shellExecutableArgs && shellExecutableArgs.length) {
      options.shellArgs = shellExecutableArgs;
    }
    const notificationMode = readParameter(
      "idf.notificationMode",
      this.currentWorkspace
    ) as string;
    const showTaskOutput =
      notificationMode === NotificationMode.All ||
      notificationMode === NotificationMode.Output
        ? TaskRevealKind.Always
        : TaskRevealKind.Silent;
    const customExecution = this.getProcessExecution(command, options);
    const customTaskPresentationOptions = {
      reveal: showTaskOutput,
      showReuseMessage: false,
      clear: false,
      panel: TaskPanelKind.Dedicated,
    } as TaskPresentationOptions;
    const currentWorkspaceFolder = workspace.workspaceFolders.find(
      (w) => w.uri === this.currentWorkspace
    );
    TaskManager.addTask(
      {
        type: "esp-idf",
        command: `ESP-IDF ${taskName}`,
        taskId: `idf-${taskType}-task`,
      },
      currentWorkspaceFolder || TaskScope.Workspace,
      `ESP-IDF ${taskName}`,
      customExecution,
      ["espIdf", "espIdfLd"],
      customTaskPresentationOptions
    );
  }

  public async runTasks(taskType: CustomTaskType) {
    let command: string;
    switch (taskType) {
      case CustomTaskType.PreBuild:
        command = readParameter(
          "idf.preBuildTask",
          this.currentWorkspace
        ) as string;
        break;
      case CustomTaskType.PostBuild:
        command = readParameter(
          "idf.postBuildTask",
          this.currentWorkspace
        ) as string;
        break;
      case CustomTaskType.PreFlash:
        command = readParameter(
          "idf.preFlashTask",
          this.currentWorkspace
        ) as string;
        break;
      case CustomTaskType.PostFlash:
        command = readParameter(
          "idf.postFlashTask",
          this.currentWorkspace
        ) as string;
        break;
      case CustomTaskType.Custom:
        command = readParameter(
          "idf.customTask",
          this.currentWorkspace
        ) as string;
      default:
        break;
    }
    if (command) {
      await TaskManager.runTasks();
    }
  }
}
