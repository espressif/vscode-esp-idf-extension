/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 3rd November 2021 4:56:23 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
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

import { ensureDir } from "fs-extra";
import { join } from "path";
import {
  ProcessExecution,
  TaskPanelKind,
  TaskPresentationOptions,
  TaskRevealKind,
  TaskScope,
  Uri,
  workspace,
} from "vscode";
import { NotificationMode, readParameter } from "../../idfConfiguration";
import { TaskManager } from "../../taskManager";
import { appendIdfAndToolsToPath } from "../../utils";
import { getVirtualEnvPythonPath } from "../../pythonManager";
import { OutputCapturingExecution } from "../../taskManager/customExecution";
import { getProjectName } from "../../workspaceConfig";

export class IdfSizeTask {
  private currentWorkspace: Uri;
  private idfSizePath: string;

  constructor(workspaceUri: Uri) {
    this.currentWorkspace = workspaceUri;
    const idfPathDir = readParameter("idf.espIdfPath", workspaceUri) as string;
    this.idfSizePath = join(idfPathDir, "tools", "idf_size.py");
  }

  public async getSizeInfo(captureOutput?: boolean) {
    const buildDirPath = readParameter(
      "idf.buildPath",
      this.currentWorkspace
    ) as string;
    await ensureDir(buildDirPath);
    const pythonCommand = await getVirtualEnvPythonPath(this.currentWorkspace);
    const projectName = await getProjectName(buildDirPath);
    const mapFilePath = join(buildDirPath, `${projectName}.map`);
    const args = [this.idfSizePath, mapFilePath];

    const modifiedEnv = await appendIdfAndToolsToPath(this.currentWorkspace);
    const processOptions = {
      cwd: buildDirPath,
      env: modifiedEnv,
    };

    const sizeExecution = captureOutput
      ? OutputCapturingExecution.create(pythonCommand, args, processOptions)
      : new ProcessExecution(pythonCommand, args, processOptions);
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
    return sizeExecution;
  }
}
