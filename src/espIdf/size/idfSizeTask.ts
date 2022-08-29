/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 3rd November 2021 4:56:23 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
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
import {
  ShellExecution,
  ShellExecutionOptions,
  TaskPanelKind,
  TaskPresentationOptions,
  TaskRevealKind,
  TaskScope,
  Uri,
} from "vscode";
import { readParameter } from "../../idfConfiguration";
import { TaskManager } from "../../taskManager";
import { appendIdfAndToolsToPath } from "../../utils";
import { getProjectName } from "../../workspaceConfig";

export class IdfSizeTask {
  private curWorkspace: Uri;
  private pythonBinPath: string;
  private idfSizePath: string;
  private buildDirName: string;

  constructor(workspacePath: Uri) {
    this.curWorkspace = workspacePath;
    this.pythonBinPath = readParameter(
      "idf.pythonBinPath",
      workspacePath
    ) as string;
    const idfPathDir = readParameter("idf.espIdfPath", workspacePath) as string;
    this.idfSizePath = join(idfPathDir, "tools", "idf_size.py");
    this.buildDirName = readParameter(
      "idf.buildDirectoryName",
      workspacePath
    ) as string;
  }

  public async getShellExecution(options: ShellExecutionOptions) {
    const mapFilePath = await this.mapFilePath();
    return new ShellExecution(
      `${this.pythonBinPath} ${this.idfSizePath} ${mapFilePath}`,
      options
    );
  }

  private async mapFilePath() {
    const projectName = await getProjectName(this.buildDirName);
    return join(this.buildDirName, `${projectName}.map`);
  }

  public async getSizeInfo() {
    const modifiedEnv = appendIdfAndToolsToPath(this.curWorkspace);
    await ensureDir(this.buildDirName);
    const options: ShellExecutionOptions = {
      cwd: this.curWorkspace.fsPath,
      env: modifiedEnv,
    };
    const sizeExecution = await this.getShellExecution(options);
    const isSilentMode = readParameter(
      "idf.notificationSilentMode",
      this.curWorkspace
    ) as boolean;
    const showTaskOutput = isSilentMode
      ? TaskRevealKind.Always
      : TaskRevealKind.Silent;
    const sizePresentationOptions = {
      reveal: showTaskOutput,
      showReuseMessage: false,
      clear: true,
      panel: TaskPanelKind.Dedicated,
    } as TaskPresentationOptions;
    TaskManager.addTask(
      { type: "esp-idf", command: "ESP-IDF Size", taskId: "idf-size-task" },
      TaskScope.Workspace,
      "ESP-IDF Size",
      sizeExecution,
      ["espIdf"],
      sizePresentationOptions
    );
  }
}
