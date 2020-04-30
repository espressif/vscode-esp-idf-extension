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

export class TaskManager {
  private static tasks: vscode.Task[] = [];

  public static async addTask(
    taskDefinition: vscode.TaskDefinition,
    scope: vscode.TaskScope,
    name: string,
    execution: vscode.ShellExecution,
    problemMatchers: string | string[],
    callback: (...args: any[]) => any
  ) {
    const newTask: vscode.Task = new vscode.Task(
      taskDefinition,
      scope,
      name,
      "espressif.esp-idf-extension",
      execution,
      problemMatchers
    );
    TaskManager.tasks.push(newTask);
    vscode.tasks.onDidEndTask((e) => {
      if (e.execution.task.name === newTask.name) {
        callback();
      }
    });
  }

  public static async runTasks(callback: (...args: any[]) => any) {
    if (TaskManager.tasks && TaskManager.tasks.length > 1) {
      let lastExecution = await vscode.tasks.executeTask(TaskManager.tasks[0]);
      let lastTask = lastExecution.task;
      for (let i = 1; i < TaskManager.tasks.length; i++) {
        vscode.tasks.onDidEndTask(async (e) => {
          if (e.execution.task.name === lastTask.name) {
            if (
              e.execution.task.name ===
              TaskManager.tasks[TaskManager.tasks.length - 1].name
            ) {
              callback();
              TaskManager.tasks = [];
            } else {
              lastExecution = await vscode.tasks.executeTask(
                TaskManager.tasks[i]
              );
              lastTask = lastExecution.task;
            }
          }
        });
      }
    } else if (TaskManager.tasks && TaskManager.tasks.length === 1) {
      let lastExecution = await vscode.tasks.executeTask(TaskManager.tasks[0]);
      let lastTask = lastExecution.task;
      vscode.tasks.onDidEndTask(async (e) => {
        if (e.execution.task.name === lastTask.name) {
          callback();
          TaskManager.tasks = [];
        }
      });
    }
  }
}
