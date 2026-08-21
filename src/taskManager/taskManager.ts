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
  Disposable,
  Task,
  TaskDefinition,
  TaskExecution,
  TaskPanelKind,
  TaskPresentationOptions,
  TaskRevealKind,
  tasks,
  TaskScope,
  Uri,
  workspace,
  WorkspaceFolder,
} from "vscode";
import { ESP } from "../config";
import { NotificationMode, readParameter } from "../configuration/idf";
import { Logger } from "../common/logger";
import type { CapturedTaskOutput, IdfTaskResult } from "./types";
import { OutputCapturingExecution } from "./customExecution";
import { ShellOutputCapturingExecution } from "./shellCaptureExecution";
import { known } from "../common/error/knownError";
import { ErrorCode } from "../common/error/types";

export interface IdfTaskDefinition extends TaskDefinition {
  command?: string;
  taskId: string;
}

export function getTaskProcessExecution(
  cmdString: string,
  args: string[],
  cwd: string,
  env: { [key: string]: string }
): OutputCapturingExecution {
  return OutputCapturingExecution.create(cmdString, args, { cwd, env });
}

export type IdfTaskExecution =
  | ShellOutputCapturingExecution
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
 * Throws if any recorded {@link IdfTaskResult} reports failure.
 */
export async function throwCapturedTaskFailure() {
  for (const result of TaskManager.getTaskResults()) {
    if (!result.output.success) {
      throw known(ErrorCode.TaskFailedWithOutput, {
        stdout: result.output.stdout,
        stderr: result.output.stderr,
        exitCode: result.output.exitCode,
        success: result.output.success,
      });
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
  private static activeRunReject: ((error: Error) => void) | undefined;
  private static taskResults: IdfTaskResult[] = [];

  private static getTaskDefinitionId(
    definition: TaskDefinition
  ): string | undefined {
    return (definition as IdfTaskDefinition).taskId;
  }

  /**
   * VS Code may omit custom definition fields (e.g. taskId) on the execution task.
   * Match the queue head (in-flight task) by id or display name.
   */
  private static executionMatchesPending(
    execution: TaskExecution,
    pendingId: string | undefined
  ): boolean {
    if (!execution || pendingId === undefined) {
      return false;
    }
    const endedId = TaskManager.getTaskDefinitionId(execution.task.definition);
    if (endedId === pendingId) {
      return true;
    }
    const inFlight = TaskManager.tasks[0];
    if (!inFlight) {
      return false;
    }
    const inFlightId = TaskManager.getTaskDefinitionId(inFlight.definition);
    if (inFlightId !== pendingId) {
      return false;
    }
    return execution.task.name === inFlight.name;
  }

  private static getInFlightTask(pendingId: string): Task | undefined {
    const inFlight = TaskManager.tasks[0];
    if (
      inFlight &&
      TaskManager.getTaskDefinitionId(inFlight.definition) === pendingId
    ) {
      return inFlight;
    }
    return TaskManager.tasks.find(
      (task) => TaskManager.getTaskDefinitionId(task.definition) === pendingId
    );
  }

  private static failedCapturedOutput(): CapturedTaskOutput {
    return {
      stdout: "",
      stderr: "",
      exitCode: 1,
      success: false,
    };
  }

  private static async resolveOutputForPendingTask(
    pendingId: string
  ): Promise<CapturedTaskOutput> {
    const pendingTask = TaskManager.getInFlightTask(pendingId);
    const execution = pendingTask?.execution;
    if (execution && "getOutput" in execution) {
      try {
        return await (execution as
          | OutputCapturingExecution
          | ShellOutputCapturingExecution).getOutput();
      } catch {
        return TaskManager.failedCapturedOutput();
      }
    }
    return {
      stdout: "",
      stderr: "",
      exitCode: 0,
      success: true,
    };
  }

  private static clearActiveRunReject(): void {
    TaskManager.activeRunReject = undefined;
  }

  private static rejectActiveRun(error: Error): void {
    const reject = TaskManager.activeRunReject;
    TaskManager.clearActiveRunReject();
    reject?.(error);
  }

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
    TaskManager.rejectActiveRun(new Error("Task run disposed"));
    for (const disposable of TaskManager.disposables) {
      disposable.dispose();
    }
    TaskManager.disposables = [];
    TaskManager.tasks = [];
  }

  public static cancelTasks() {
    for (const task of TaskManager.tasks) {
      const execution = tasks.taskExecutions.find((t) => {
        const runningId = TaskManager.getTaskDefinitionId(t.task.definition);
        const queuedId = TaskManager.getTaskDefinitionId(task.definition);
        return runningId === queuedId || t.task.name === task.name;
      });
      if (execution) {
        execution.terminate();
      }
    }
    TaskManager.tasks = [];
    TaskManager.rejectActiveRun(new Error("BUILD_TERMINATED"));
  }

  public static runTasks(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let taskEndDisposable: Disposable | undefined;

      const disposeTaskListeners = () => {
        if (taskEndDisposable) {
          taskEndDisposable.dispose();
          const taskIndex = TaskManager.disposables.indexOf(taskEndDisposable);
          if (taskIndex !== -1) {
            TaskManager.disposables.splice(taskIndex, 1);
          }
          taskEndDisposable = undefined;
        }
      };

      let pendingTaskMatchId: string | undefined;
      const handledCompletionIds = new Set<string>();

      const finishRun = (error?: Error) => {
        disposeTaskListeners();
        TaskManager.tasks = [];
        TaskManager.clearActiveRunReject();
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      };

      const rejectTaskRun = (error: unknown) => {
        finishRun(error instanceof Error ? error : new Error(String(error)));
      };

      TaskManager.activeRunReject = rejectTaskRun;

      const startNextTask = () => {
        if (TaskManager.tasks.length === 0) {
          finishRun();
          return;
        }
        pendingTaskMatchId = TaskManager.getTaskDefinitionId(
          TaskManager.tasks[0].definition
        );
        Promise.resolve(tasks.executeTask(TaskManager.tasks[0])).then(
          undefined,
          rejectTaskRun
        );
      };

      const handleTaskFinished = async (execution: TaskExecution) => {
        if (
          !TaskManager.executionMatchesPending(execution, pendingTaskMatchId)
        ) {
          return;
        }

        const matchedTaskId = pendingTaskMatchId!;
        if (handledCompletionIds.has(matchedTaskId)) {
          return;
        }
        handledCompletionIds.add(matchedTaskId);

        const output = await TaskManager.resolveOutputForPendingTask(
          matchedTaskId
        );

        TaskManager.taskResults.push({
          taskId: matchedTaskId,
          taskName: execution.task.name,
          output,
        });

        const taskIndex = TaskManager.tasks.findIndex(
          (task) =>
            TaskManager.getTaskDefinitionId(task.definition) === matchedTaskId
        );
        if (taskIndex !== -1) {
          TaskManager.tasks.splice(taskIndex, 1);
        }

        const exitCode = output.success ? 0 : output.exitCode ?? 1;
        if (exitCode !== 0) {
          const taskExitError = new Error(
            `Task ${execution.task.name} exited with code ${exitCode}`
          );
          (taskExitError as Error & { exitCode: number }).exitCode = exitCode;
          rejectTaskRun(taskExitError);
          return;
        }

        startNextTask();
      };

      try {
        if (TaskManager.tasks.length === 0) {
          finishRun();
          return;
        }

        taskEndDisposable = tasks.onDidEndTask((e) => {
          void handleTaskFinished(e.execution).catch(rejectTaskRun);
        });

        TaskManager.disposables.push(taskEndDisposable);
        startNextTask();
      } catch (err) {
        rejectTaskRun(err);
      }
    });
  }

  public static getTaskResults(): IdfTaskResult[] {
    return TaskManager.taskResults;
  }

  public static getTaskResult(taskId: string): IdfTaskResult | undefined {
    for (let i = TaskManager.taskResults.length - 1; i >= 0; i--) {
      const result = TaskManager.taskResults[i];
      if (result.taskId === taskId) {
        return result;
      }
    }
    return undefined;
  }

  public static recordTaskResult(result: IdfTaskResult): void {
    TaskManager.taskResults.push(result);
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
    presentation?: TaskPresentationOptions;
  }
): OutputCapturingExecution {
  const execution = getTaskProcessExecution(command, args, cwd, env);
  TaskManager.addTask(
    name,
    getWorkspaceFolderForTask(workspaceUri),
    execution,
    options?.presentation
  );
  return execution;
}
