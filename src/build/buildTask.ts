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

import { ensureDir } from "fs-extra";
import { join } from "path";
import { Logger } from "../logger/logger";
import * as vscode from "vscode";
import * as idfConf from "../idfConfiguration";
import { appendIdfAndToolsToPath } from "../utils";
import {
  getProjectName,
  initSelectedWorkspace,
  updateIdfComponentsTree,
} from "../workspaceConfig";
import { TaskManager } from "../taskManager";

export class BuildTask {
  public static isBuilding: boolean;
  private buildTask: vscode.TaskExecution;
  private compileTask: vscode.TaskExecution;
  private curWorkspace: string;

  constructor(workspace: string) {
    this.curWorkspace = join(workspace, "build");
  }

  private building(flag: boolean) {
    BuildTask.isBuilding = flag;
  }

  private async saveBeforeBuild() {
    const shallSaveBeforeBuild = idfConf.readParameter("idf.saveBeforeBuild");
    if (shallSaveBeforeBuild) {
      await vscode.workspace.saveAll();
    }
  }

  public cancel() {
    if (this.buildTask) {
      this.buildTask.terminate();
      throw new Error(`BUILD_TERMINATED`);
    }
    if (this.compileTask) {
      this.compileTask.terminate();
      throw new Error(`BUILD_TERMINATED`);
    }
  }

  public getShellExecution(
    args: string[],
    options?: vscode.ShellExecutionOptions
  ) {
    return new vscode.ShellExecution(`cmake ${args.join(" ")}`, options);
  }

  public async build() {
    try {
      await this.saveBeforeBuild();
    } catch (error) {
      const errorMessage =
        "Failed to save unsaved files, ignoring and continuing with the build";
      Logger.error(errorMessage, error);
      Logger.warnNotify(errorMessage);
    }
    if (BuildTask.isBuilding) {
      throw new Error("ALREADY_BUILDING");
    }
    this.building(true);
    const modifiedEnv = appendIdfAndToolsToPath();
    await ensureDir(this.curWorkspace);
    const options: vscode.ShellExecutionOptions = {
      cwd: this.curWorkspace,
      env: modifiedEnv,
    };
    const compileExecution = this.getShellExecution(
      ["-G", "Ninja", ".."],
      options
    );
    /* await TaskManager.addTask(
      { type: "shell" },
      vscode.TaskScope.Workspace,
      "ESP-IDF Compile",
      compileExecution,
      ["idfRelative", "idfAbsolute"],
      () => {}
    );
    const buildExecution = this.getShellExecution(["--build", "."], options);
    await TaskManager.addTask(
      { type: "shell" },
      vscode.TaskScope.Workspace,
      "ESP-IDF Build",
      buildExecution,
      ["idfRelative", "idfAbsolute"],
      () => {
        this.building(false);
        const projDescPath = join(
          this.curWorkspace,
          "project_description.json"
        );
        updateIdfComponentsTree(projDescPath);
        Logger.infoNotify("Build Successfully");
      }
    );
    TaskManager.runInSequence(); */
    const compileTask = new vscode.Task(
      { type: "shell" },
      vscode.TaskScope.Workspace,
      "ESP-IDF Compile",
      "espressif.esp-idf-extension",
      compileExecution,
      ["idfRelative", "idfAbsolute"]
    );
    const buildExecution = this.getShellExecution(["--build", "."], options);
    const buildTask = new vscode.Task(
      { type: "shell" },
      vscode.TaskScope.Workspace,
      "ESP-IDF Build",
      "espressif.esp-idf-extension",
      buildExecution,
      ["idfRelative", "idfAbsolute"]
    );
    this.compileTask = await vscode.tasks.executeTask(compileTask);
    vscode.tasks.onDidEndTask(async (e) => {
      if (e.execution.task.name === "ESP-IDF Compile") {
        this.buildTask = await vscode.tasks.executeTask(buildTask);
      } else if (e.execution.task.name === "ESP-IDF Build") {
        this.building(false);
        const projDescPath = join(
          this.curWorkspace,
          "project_description.json"
        );
        updateIdfComponentsTree(projDescPath);
        Logger.infoNotify("Build Successfully");
      }
    });
  }
}
