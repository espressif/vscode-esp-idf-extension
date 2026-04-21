/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 27th September 2019 9:59:57 pm
 * Copyright 2019 Espressif Systems (Shanghai) CO LTD
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
  CustomExecution,
  Disposable,
  ProcessExecution,
  ShellExecution,
  Task,
  TaskDefinition,
  TaskPanelKind,
  TaskPresentationOptions,
  TaskRevealKind,
  tasks,
  TaskScope,
  Uri,
  workspace,
  WorkspaceFolder,
} from "vscode";
import { ESP } from "./config";
import { NotificationMode, readParameter } from "./idfConfiguration";
import {
  OutputCapturingExecution,
  ShellOutputCapturingExecution,
} from "./taskManager/customExecution";

export interface IdfTaskDefinition extends TaskDefinition {
  command?: string;
  taskId: string;
}

export function getTaskProcessExecution(
  cmdString: string,
  args: string[],
  cwd: string,
  env: { [key: string]: string },
  captureOutput?: boolean
): OutputCapturingExecution | ProcessExecution {
  return captureOutput
    ? OutputCapturingExecution.create(cmdString, args, { cwd, env })
    : new ProcessExecution(cmdString, args, { cwd, env });
}

export type IdfTaskExecution =
  | ShellOutputCapturingExecution
  | ShellExecution
  | ProcessExecution
  | CustomExecution
  | OutputCapturingExecution;

export type MaybeIdfTaskExecution = IdfTaskExecution | undefined;

export function collectExecutions(
  ...executions: MaybeIdfTaskExecution[]
): IdfTaskExecution[] {
  return executions.filter(
    (execution): execution is IdfTaskExecution => execution !== undefined
  );
}

export async function throwCapturedTaskFailure(
  executions: MaybeIdfTaskExecution[]
) {
  for (const execution of executions) {
    if (!execution || !("getOutput" in execution)) {
      continue;
    }

    const executionOutput = await (execution as
      | OutputCapturingExecution
      | ShellOutputCapturingExecution).getOutput();
    if (executionOutput && !executionOutput.success) {
      if (executionOutput.stderr?.trim()) {
        throw new Error(executionOutput.stderr);
      }
      if (executionOutput.stdout?.trim()) {
        throw new Error(executionOutput.stdout);
      }
      throw new Error(`Task exited with code ${executionOutput.exitCode}`);
    }
  }
}

export function getWorkspaceFolderForTask(
  workspaceUri: Uri
): WorkspaceFolder | undefined {
  return workspace.getWorkspaceFolder(workspaceUri);
}

export class TaskManager {
  private static tasks: Task[] = [];
  private static disposables: Disposable[] = [];
  private static taskResults: Array<{
    taskId: string;
    output?: any;
    error?: Error;
  }> = [];

  public static addTask(
    name: string,
    currentWorkspaceFolder: WorkspaceFolder | undefined,
    execution: IdfTaskExecution,
    presentationOptions?: TaskPresentationOptions
  ): void {
    // Check if a task with the same taskId already exists
    const taskId = `idf-${name.toLowerCase().replace(/\s+/g, "-")}-task`;
    const existingTaskIndex = TaskManager.tasks.findIndex(
      (task) => task.definition.taskId === taskId
    );
    if (existingTaskIndex !== -1) {
      // Task with this taskId already exists, skip adding
      return;
    }

    const newTask: Task = new Task(
      {
        type: "esp-idf",
        command: `ESP-IDF ${name}`,
        taskId,
      } as IdfTaskDefinition,
      currentWorkspaceFolder || TaskScope.Workspace,
      `ESP-IDF ${name}`,
      ESP.extensionID,
      execution,
      ["espIdf", "espIdfLd"]
    );
    const notificationMode = readParameter(
      "idf.notificationMode",
      currentWorkspaceFolder
    ) as string;
    const showTaskOutput =
      notificationMode === NotificationMode.All ||
      notificationMode === NotificationMode.Output
        ? TaskRevealKind.Always
        : TaskRevealKind.Silent;
    newTask.presentationOptions = {
      reveal: showTaskOutput,
      showReuseMessage: presentationOptions?.showReuseMessage || false,
      clear: presentationOptions?.clear || false,
      panel: presentationOptions?.panel || TaskPanelKind.Shared,
    } as TaskPresentationOptions;
    TaskManager.tasks.push(newTask);
  }

  public static disposeListeners() {
    for (const disposable of TaskManager.disposables) {
      disposable.dispose();
    }
    TaskManager.disposables = [];
    TaskManager.tasks = [];
  }

  public static cancelTasks() {
    for (const task of TaskManager.tasks) {
      const execution = tasks.taskExecutions.find((t) => {
        // Match the exact taskId we use in our definitions.
        return t.task.definition.taskId === task.definition.taskId;
      });
      if (execution) {
        execution.terminate();
      }
    }
    TaskManager.tasks = [];
  }

  public static async runTasks() {
    return new Promise<void>(async (resolve, reject) => {
      if (TaskManager.tasks.length === 0) {
        return resolve();
      }
      let lastExecution = await tasks.executeTask(TaskManager.tasks[0]);
      const taskDisposable = tasks.onDidEndTaskProcess(async (e) => {
        if (
          e.execution &&
          e.execution.task.definition.taskId ===
            lastExecution.task.definition.taskId
        ) {
          const taskResult = {
            taskId: lastExecution.task.definition.taskId,
            exitCode: e.exitCode,
            taskName: lastExecution.task.name,
          };
          TaskManager.taskResults.push(taskResult);

          // Remove the completed task from the array (regardless of success or failure)
          const taskIndex = TaskManager.tasks.findIndex(
            (task) =>
              task.definition.taskId === lastExecution.task.definition.taskId
          );
          if (taskIndex !== -1) {
            TaskManager.tasks.splice(taskIndex, 1);
          }

          if (e.exitCode !== 0) {
            // Task has already ended (this handler is triggered *after* end),
            // so terminating here is unnecessary and can produce VS Code errors
            // like "Task to terminate not found".
            this.cancelTasks();
            this.disposeListeners();
            return reject(
              new Error(
                `Task ${lastExecution.task.name} exited with code ${e.exitCode}`
              )
            );
          }
          if (TaskManager.tasks.length === 0) {
            TaskManager.tasks = [];
            return resolve();
          } else {
            lastExecution = await tasks.executeTask(TaskManager.tasks[0]);
          }
        }
      });
      TaskManager.disposables.push(taskDisposable);
    });
  }

  public static getTaskResults() {
    return TaskManager.taskResults;
  }

  public static clearTaskResults() {
    TaskManager.taskResults = [];
  }

  public static async runTasksWithBoolean() {
    try {
      await TaskManager.runTasks();
      return true;
    } catch (error) {
      return false;
    }
  }
}

export function addProcessTask(
  name: string,
  workspaceUri: Uri,
  command: string,
  args: string[],
  cwd: string,
  env: { [key: string]: string },
  options?: {
    captureOutput?: boolean;
    presentation?: TaskPresentationOptions;
  }
): OutputCapturingExecution | ProcessExecution {
  const execution = getTaskProcessExecution(
    command,
    args,
    cwd,
    env,
    options?.captureOutput
  );
  TaskManager.addTask(
    name,
    getWorkspaceFolderForTask(workspaceUri),
    execution,
    options?.presentation
  );
  return execution;
}
