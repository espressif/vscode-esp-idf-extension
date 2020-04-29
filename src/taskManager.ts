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
    taskScope: vscode.TaskScope,
    taskName: string,
    execution: vscode.ShellExecution,
    problemMatchers: string | string[],
    callback: (...args: any[]) => any
  ) {
    const newTask = new vscode.Task(
      taskDefinition,
      taskScope,
      taskName,
      "espressif.esp-idf-extension",
      execution,
      problemMatchers
    );

    this.tasks.push(newTask);

    /* if (this.lastTask) {
      vscode.tasks.onDidEndTask(async (e) => {
        if (e.execution.task.name === newTask.name) {
          callback();
          this.lastTask = undefined;
        } else if (e.execution.task.name === this.lastTask.name) {
          const newExecution = await vscode.tasks.executeTask(newTask);
          this.lastTask = newExecution.task;
        }
      });
    } else {
      const newTaskExecution = await vscode.tasks.executeTask(newTask);
      this.lastTask = newTaskExecution.task;
      vscode.tasks.onDidEndTask(async (e) => {
        if (e.execution.task.name === this.lastTask.name) {
          callback();
          this.lastTask = undefined;
        }
      });
    } */
  }

  public static async runInSequence() {
    let lastTask: vscode.Task;
    for (const t of this.tasks) {
      if (lastTask) {
        vscode.tasks.onDidEndTask(async (e) => {
          if (lastTask && e.execution.task.name === lastTask.name) {
            vscode.tasks.executeTask(t);
            lastTask = t;
          }
        });
      } else {
        const execution = await vscode.tasks.executeTask(t);
        lastTask = execution.task;
      }
    }
    lastTask = undefined;
    this.tasks = [];
  }
}
