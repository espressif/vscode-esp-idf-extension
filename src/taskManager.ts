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

import * as vscode from "vscode";
import { ESP } from "./config";

export interface IdfTaskDefinition extends vscode.TaskDefinition {
  command?: string;
  taskId: string;
}

export class TaskManager {
  private static tasks: vscode.Task[] = [];
  private static disposables: vscode.Disposable[] = [];
  private static taskResults: Array<{
    taskId: string;
    output?: any;
    error?: Error;
  }> = [];

  public static addTask(
    taskDefinition: IdfTaskDefinition,
    scope: vscode.WorkspaceFolder | vscode.TaskScope,
    name: string,
    execution:
      | vscode.ShellExecution
      | vscode.ProcessExecution
      | vscode.CustomExecution,
    problemMatchers: string | string[],
    presentationOptions: vscode.TaskPresentationOptions
  ): void {
    // Check if a task with the same taskId already exists
    const existingTaskIndex = TaskManager.tasks.findIndex(
      (task) => task.definition.taskId === taskDefinition.taskId
    );
    if (existingTaskIndex !== -1) {
      // Task with this taskId already exists, skip adding
      return;
    }

    const newTask: vscode.Task = new vscode.Task(
      taskDefinition,
      scope,
      name,
      ESP.extensionID,
      execution,
      problemMatchers
    );
    newTask.presentationOptions = presentationOptions;
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
      const execution = vscode.tasks.taskExecutions.find((t) => {
        return t.task.definition.taskId.indexOf(task.definition.taskId) !== -1;
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
      let lastExecution = await vscode.tasks.executeTask(TaskManager.tasks[0]);
      const taskDisposable = vscode.tasks.onDidEndTaskProcess(async (e) => {
        if (
          e.execution &&
          e.execution.task.definition.taskId.indexOf(
            lastExecution.task.definition.taskId
          ) !== -1
        ) {
          const taskResult = {
            taskId: lastExecution.task.definition.taskId,
            exitCode: e.exitCode,
            taskName: lastExecution.task.name,
          };
          TaskManager.taskResults.push(taskResult);

          // Remove the completed task from the array (regardless of success or failure)
          const taskIndex = TaskManager.tasks.findIndex(
            (task) => task.definition.taskId === lastExecution.task.definition.taskId
          );
          if (taskIndex !== -1) {
            TaskManager.tasks.splice(taskIndex, 1);
          }

          if (e.exitCode !== 0) {
            e.execution.terminate();
            this.cancelTasks();
            this.disposeListeners();
            return reject(
              new Error(
                `Task ${lastExecution.task.name} exited with code ${e.exitCode}`
              )
            );
          }
          e.execution.terminate();
          if (TaskManager.tasks.length === 0) {
            TaskManager.tasks = [];
            return resolve();
          } else {
            lastExecution = await vscode.tasks.executeTask(
              TaskManager.tasks[0]
            );
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
