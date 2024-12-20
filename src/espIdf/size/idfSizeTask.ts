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
  TaskPanelKind,
  ProcessExecutionOptions,
  TaskPresentationOptions,
  TaskRevealKind,
  TaskScope,
  Uri,
  workspace,
  ProcessExecution,
} from "vscode";
import { NotificationMode, readParameter } from "../../idfConfiguration";
import { TaskManager } from "../../taskManager";
import { appendIdfAndToolsToPath } from "../../utils";
import { getProjectName } from "../../workspaceConfig";
import { getVirtualEnvPythonPath } from "../../pythonManager";

export class IdfSizeTask {
  private currentWorkspace: Uri;
  private idfSizePath: string;
  private buildDirPath: string;

  constructor(workspaceUri: Uri) {
    this.currentWorkspace = workspaceUri;
    const customExtraVars = readParameter(
      "idf.customExtraVars",
      workspaceUri
    ) as { [key: string]: string };
    const idfPath = customExtraVars["IDF_PATH"];
    this.idfSizePath = join(idfPath, "tools", "idf_size.py");
    this.buildDirPath = readParameter("idf.buildPath", workspaceUri) as string;
  }

  private async mapFilePath() {
    const projectName = await getProjectName(this.buildDirPath);
    return join(this.buildDirPath, `${projectName}.map`);
  }

  public async getSizeInfo() {
    await ensureDir(this.buildDirPath);
    const pythonCommand = await getVirtualEnvPythonPath(this.currentWorkspace);
    const mapFilePath = await this.mapFilePath();
    const args = [this.idfSizePath, mapFilePath];

    const modifiedEnv = await appendIdfAndToolsToPath(this.currentWorkspace);
    const processOptions = {
      cwd: this.buildDirPath,
      env: modifiedEnv,
    };

    const sizeExecution = new ProcessExecution(
      pythonCommand,
      args,
      processOptions
    );
    const notificationMode = readParameter(
      "idf.notificationMode",
      this.currentWorkspace
    ) as string;
    const currentWorkspaceFolder = workspace.workspaceFolders.find(
      (w) => w.uri === this.currentWorkspace
    );
    const showTaskOutput =
      notificationMode === NotificationMode.All ||
      notificationMode === NotificationMode.Output
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
      currentWorkspaceFolder || TaskScope.Workspace,
      "ESP-IDF Size",
      sizeExecution,
      ["espIdf"],
      sizePresentationOptions
    );
  }
}
