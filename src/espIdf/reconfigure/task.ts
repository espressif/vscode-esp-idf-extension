/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 22nd May 2024 4:45:50 pm
 * Copyright 2024 Espressif Systems (Shanghai) CO LTD
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
  ProcessExecution,
  ProcessExecutionOptions,
  TaskPanelKind,
  TaskPresentationOptions,
  TaskRevealKind,
  TaskScope,
  Uri,
  workspace,
} from "vscode";
import { NotificationMode, readParameter } from "../../idfConfiguration";
import { appendIdfAndToolsToPath, getSDKConfigFilePath } from "../../utils";
import { join } from "path";
import { TaskManager } from "../../taskManager";
import { getVirtualEnvPythonPath } from "../../pythonManager";

export class IdfReconfigureTask {
  private buildDirPath: string;
  private curWorkspace: Uri;

  constructor(workspace: Uri) {
    this.curWorkspace = workspace;
    this.buildDirPath = readParameter("idf.buildPath", workspace) as string;
  }

  public async reconfigure() {
    const modifiedEnv = await appendIdfAndToolsToPath(this.curWorkspace);
    const options: ProcessExecutionOptions = {
      cwd: this.curWorkspace.fsPath,
      env: modifiedEnv,
    };
    const currentWorkspaceFolder = workspace.workspaceFolders.find(
      (w) => w.uri === this.curWorkspace
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

    const idfPy = join(modifiedEnv["IDF_PATH"], "tools", "idf.py");
    const reconfigureArgs = [idfPy];

    let buildPathArgsIndex = reconfigureArgs.indexOf("-B");
    if (buildPathArgsIndex !== -1) {
      reconfigureArgs.splice(buildPathArgsIndex, 2);
    }
    reconfigureArgs.push("-B", this.buildDirPath);

    const sdkconfigFile = await getSDKConfigFilePath(this.curWorkspace);
    if (reconfigureArgs.indexOf("SDKCONFIG") === -1) {
      reconfigureArgs.push(`-DSDKCONFIG=${sdkconfigFile}`);
    }

    const sdkconfigDefaults =
      (readParameter("idf.sdkconfigDefaults") as string[]) || [];
    if (
      reconfigureArgs.indexOf("SDKCONFIG_DEFAULTS") === -1 &&
      sdkconfigDefaults &&
      sdkconfigDefaults.length
    ) {
      reconfigureArgs.push(
        `-DSDKCONFIG_DEFAULTS='${sdkconfigDefaults.join(";")}'`
      );
    }

    const enableCCache = readParameter(
      "idf.enableCCache",
      this.curWorkspace
    ) as boolean;
    if (enableCCache && reconfigureArgs && reconfigureArgs.length) {
      const indexOfCCache = reconfigureArgs.indexOf("-DCCACHE_ENABLE=1");
      if (indexOfCCache === -1) {
        reconfigureArgs.push("-DCCACHE_ENABLE=1");
      }
    }

    reconfigureArgs.push("reconfigure");

    const pythonBinPath = await getVirtualEnvPythonPath(this.curWorkspace);

    const reconfigureExecution = new ProcessExecution(
      pythonBinPath,
      reconfigureArgs,
      options
    );
    const presentationOptions = {
      reveal: showTaskOutput,
      showReuseMessage: false,
      clear: false,
      panel: TaskPanelKind.Shared,
    } as TaskPresentationOptions;

    TaskManager.addTask(
      {
        type: "esp-idf",
        command: "ESP-IDF Reconfigure",
        taskId: "idf-reconfigure-task",
      },
      currentWorkspaceFolder || TaskScope.Workspace,
      "ESP-IDF Reconfigure",
      reconfigureExecution,
      ["espIdf"],
      presentationOptions
    );
  }
}
