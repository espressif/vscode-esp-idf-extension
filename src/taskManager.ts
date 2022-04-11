/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 27th September 2019 9:59:57 pm
 * Copyright 2019 Espressif Systems (Shanghai) CO LTD
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

import * as vscode from "vscode";
import { ESP } from "./config";

export interface IdfTaskDefinition extends vscode.TaskDefinition {
  command?: string;
  taskId: string;
}

export class TaskManager {
  private static tasks: vscode.Task[] = [];
  private static disposables: vscode.Disposable[] = [];

  public static addTask(
    taskDefinition: IdfTaskDefinition,
    scope: vscode.TaskScope,
    name: string,
    execution:
      | vscode.ShellExecution
      | vscode.ProcessExecution
      | vscode.CustomExecution,
    problemMatchers: string | string[],
    presentationOptions: vscode.TaskPresentationOptions
  ) {
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
    return new Promise<void>((resolve, reject) => {
      vscode.tasks.onDidEndTask((e) => {
        if (
          e.execution.task.definition.taskId.indexOf(
            newTask.definition.taskId
          ) !== -1
        ) {
          return resolve();
        }
      });
    });
  }

  public static disposeListeners() {
    for (const disposable of TaskManager.disposables) {
      disposable.dispose();
    }
    TaskManager.disposables = [];
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
      let lastExecution = await vscode.tasks.executeTask(TaskManager.tasks[0]);
      const taskDisposable = vscode.tasks.onDidEndTaskProcess(async (e) => {
        if (
          e.execution.task.definition.taskId.indexOf(
            lastExecution.task.definition.taskId
          ) !== -1
        ) {
          if (e.exitCode !== 0) {
            this.cancelTasks();
            this.disposeListeners();
            return reject(
              new Error(
                `Task ${lastExecution.task.name} exited with code ${e.exitCode}`
              )
            );
          }
          e.execution.terminate();
          TaskManager.tasks.splice(0, 1);
          if (TaskManager.tasks.length === 0) {
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
}
