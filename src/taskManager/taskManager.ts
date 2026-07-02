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
import type { CaptureableTaskExecution } from "./types";
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
      throw known(ErrorCode.TaskFailedWithOutput, {
        stdout: executionOutput.stdout,
        stderr: executionOutput.stderr,
        exitCode: executionOutput.exitCode,
        success: executionOutput.success,
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
  private static taskResults: Array<{
    taskId: string;
    exitCode?: number;
    taskName?: string;
    output?: any;
    error?: Error;
  }> = [];

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

  private static taskUsesProcessExecution(task: Task): boolean {
    return (
      task.execution instanceof ProcessExecution ||
      task.execution instanceof ShellExecution
    );
  }

  private static async resolveExitCodeForPendingTask(
    pendingId: string,
    processExitCode: number | undefined
  ): Promise<number> {
    if (typeof processExitCode === "number") {
      return processExitCode;
    }
    const pendingTask = TaskManager.getInFlightTask(pendingId);
    if (pendingTask && "getOutput" in pendingTask.execution) {
      const output = await (
        pendingTask.execution as {
          getOutput: () => Promise<{
            success: boolean;
            exitCode?: number;
          }>;
        }
      ).getOutput();
      return output.success ? 0 : (output.exitCode ?? 1);
    }
    return 0;
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
      let processEndDisposable: Disposable | undefined;
      let taskEndDisposable: Disposable | undefined;
      const processExitCodes = new Map<string, number | undefined>();

      const disposeTaskListeners = () => {
        if (processEndDisposable) {
          processEndDisposable.dispose();
          const processIndex =
            TaskManager.disposables.indexOf(processEndDisposable);
          if (processIndex !== -1) {
            TaskManager.disposables.splice(processIndex, 1);
          }
          processEndDisposable = undefined;
        }
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
        if (!TaskManager.executionMatchesPending(execution, pendingTaskMatchId)) {
          return;
        }

        const matchedTaskId = pendingTaskMatchId!;
        if (handledCompletionIds.has(matchedTaskId)) {
          return;
        }
        handledCompletionIds.add(matchedTaskId);

        const inFlightTask = TaskManager.getInFlightTask(matchedTaskId);
        let processExitCode = processExitCodes.get(matchedTaskId);
        if (
          processExitCode === undefined &&
          inFlightTask &&
          TaskManager.taskUsesProcessExecution(inFlightTask)
        ) {
          await new Promise<void>((r) => setImmediate(r));
          processExitCode = processExitCodes.get(matchedTaskId);
        }
        processExitCodes.delete(matchedTaskId);

        const exitCode = await TaskManager.resolveExitCodeForPendingTask(
          matchedTaskId,
          processExitCode
        );

        TaskManager.taskResults.push({
          taskId: matchedTaskId,
          exitCode,
          taskName: execution.task.name,
        });

        const taskIndex = TaskManager.tasks.findIndex(
          (task) =>
            TaskManager.getTaskDefinitionId(task.definition) === matchedTaskId
        );
        if (taskIndex !== -1) {
          TaskManager.tasks.splice(taskIndex, 1);
        }

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

        processEndDisposable = tasks.onDidEndTaskProcess((e) => {
          try {
            if (
              !TaskManager.executionMatchesPending(
                e.execution,
                pendingTaskMatchId
              )
            ) {
              return;
            }
            const matchedTaskId = pendingTaskMatchId!;
            processExitCodes.set(matchedTaskId, e.exitCode);
          } catch (listenerErr) {
            rejectTaskRun(listenerErr);
          }
        });

        taskEndDisposable = tasks.onDidEndTask((e) => {
          void handleTaskFinished(e.execution).catch(rejectTaskRun);
        });

        TaskManager.disposables.push(processEndDisposable, taskEndDisposable);
        startNextTask();
      } catch (err) {
        rejectTaskRun(err);
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
