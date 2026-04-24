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
import { Logger } from "./logger/logger";
import type { CaptureableTaskExecution } from "./taskManager/customExecution";
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

/**
 * Filter out undefined executions and return only defined executions.
 * @param executions List of executions that could be undefined
 * @returns {IdfTaskExecution[]} List of executions that are defined
 */
export function collectExecutions(
  ...executions: MaybeIdfTaskExecution[]
): IdfTaskExecution[] {
  return executions.filter(
    (execution): execution is IdfTaskExecution => execution !== undefined
  );
}

/**
 * Throws if any output-capturing execution reports failure (see
 * {@link OutputCapturingExecution} / {@link ShellOutputCapturingExecution}); other
 * execution types are ignored.
 *
 * Callers that must always surface a command failure as an exception cannot rely
 * on this alone: pass at least one output-capturing execution, or check
 * `continueFlag` / task results separately.
 */
export async function throwCapturedTaskFailure(
  executions: ReadonlyArray<MaybeIdfTaskExecution | CaptureableTaskExecution>
) {
  for (const execution of executions) {
    if (!execution || !("getOutput" in execution)) {
      continue;
    }

    const executionOutput = await (execution as
      | OutputCapturingExecution
      | ShellOutputCapturingExecution
      | CaptureableTaskExecution).getOutput();
    if (executionOutput && !executionOutput.success) {
      if (executionOutput.stderr?.trim()) {
        throw new Error(executionOutput.stderr);
      }
      if (executionOutput.stdout?.trim()) {
        throw new Error(executionOutput.stdout);
      }
      const taskExitError = new Error(
        `Task exited with code ${executionOutput.exitCode}`
      );
      if (typeof executionOutput.exitCode === "number") {
        (taskExitError as Error & { exitCode: number }).exitCode =
          executionOutput.exitCode;
      }
      throw taskExitError;
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
    exitCode?: number;
    taskName?: string;
    output?: any;
    error?: Error;
  }> = [];

  public static addTask(
    name: string,
    currentWorkspaceFolder: WorkspaceFolder | undefined,
    execution: IdfTaskExecution,
    presentationOptions?: TaskPresentationOptions
  ): void {
    const nameSlug = name.toLowerCase().replace(/\s+/g, "-");
    let taskId = `idf-${nameSlug}-task`;
    let disambiguator = 0;
    while (
      TaskManager.tasks.findIndex(
        (task) => task.definition.taskId === taskId
      ) !== -1
    ) {
      disambiguator++;
      taskId = `idf-${nameSlug}-task-${disambiguator}`;
    }
    if (disambiguator > 0) {
      Logger.warn(
        `ESP-IDF task id collision for name "${name}"; registered as ${taskId}`,
        { context: "TaskManager.addTask" }
      );
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
      showReuseMessage: presentationOptions?.showReuseMessage ?? false,
      clear: presentationOptions?.clear ?? false,
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

  public static runTasks(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let taskDisposable: Disposable | undefined;
      const disposeTaskListener = () => {
        if (taskDisposable) {
          taskDisposable.dispose();
          const i = TaskManager.disposables.indexOf(taskDisposable);
          if (i !== -1) {
            TaskManager.disposables.splice(i, 1);
          }
          taskDisposable = undefined;
        }
      };

      /** Task id we expect `onDidEndTaskProcess` to report for the in-flight execution (set before each `executeTask`). */
      let pendingTaskMatchId: string | undefined;

      try {
        if (TaskManager.tasks.length === 0) {
          resolve();
          return;
        }

        taskDisposable = tasks.onDidEndTaskProcess((e) => {
          try {
            if (
              !e.execution ||
              pendingTaskMatchId === undefined ||
              e.execution.task.definition.taskId !== pendingTaskMatchId
            ) {
              return;
            }
            const taskResult = {
              taskId: e.execution.task.definition.taskId,
              exitCode: e.exitCode,
              taskName: e.execution.task.name,
            };
            TaskManager.taskResults.push(taskResult);

            // Remove the completed task from the array (regardless of success or failure)
            const taskIndex = TaskManager.tasks.findIndex(
              (task) => task.definition.taskId === pendingTaskMatchId
            );
            if (taskIndex !== -1) {
              TaskManager.tasks.splice(taskIndex, 1);
            }

            if (e.exitCode !== 0) {
              // Task has already ended (this handler runs after end); queued tasks
              // are dropped without terminate() because they are not running yet.
              disposeTaskListener();
              TaskManager.tasks = [];
              TaskManager.disposeListeners();
              const taskExitError = new Error(
                `Task ${e.execution.task.name} exited with code ${e.exitCode}`
              );
              if (typeof e.exitCode === "number") {
                (taskExitError as Error & { exitCode: number }).exitCode =
                  e.exitCode;
              }
              reject(taskExitError);
              return;
            }
            if (TaskManager.tasks.length === 0) {
              disposeTaskListener();
              resolve();
              return;
            }
            try {
              pendingTaskMatchId = (TaskManager.tasks[0]
                .definition as IdfTaskDefinition).taskId;
              Promise.resolve(tasks.executeTask(TaskManager.tasks[0])).then(
                undefined,
                (err) => {
                  disposeTaskListener();
                  TaskManager.cancelTasks();
                  TaskManager.disposeListeners();
                  reject(err instanceof Error ? err : new Error(String(err)));
                }
              );
            } catch (err) {
              disposeTaskListener();
              TaskManager.cancelTasks();
              TaskManager.disposeListeners();
              reject(err instanceof Error ? err : new Error(String(err)));
            }
          } catch (listenerErr) {
            disposeTaskListener();
            TaskManager.cancelTasks();
            TaskManager.disposeListeners();
            reject(
              listenerErr instanceof Error
                ? listenerErr
                : new Error(String(listenerErr))
            );
          }
        });
        TaskManager.disposables.push(taskDisposable);

        try {
          pendingTaskMatchId = (TaskManager.tasks[0]
            .definition as IdfTaskDefinition).taskId;
          Promise.resolve(tasks.executeTask(TaskManager.tasks[0])).then(
            undefined,
            (err) => {
              disposeTaskListener();
              TaskManager.cancelTasks();
              TaskManager.disposeListeners();
              reject(err instanceof Error ? err : new Error(String(err)));
            }
          );
        } catch (err) {
          disposeTaskListener();
          TaskManager.cancelTasks();
          TaskManager.disposeListeners();
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      } catch (err) {
        disposeTaskListener();
        TaskManager.cancelTasks();
        TaskManager.disposeListeners();
        reject(err instanceof Error ? err : new Error(String(err)));
      }
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
