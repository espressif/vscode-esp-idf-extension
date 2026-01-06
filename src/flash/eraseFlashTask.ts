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
  ProcessExecution,
  TaskPanelKind,
  TaskPresentationOptions,
  TaskRevealKind,
  TaskScope,
  Uri,
  workspace,
} from "vscode";
import { join } from "path";
import { constants } from "fs";
import { NotificationMode, readParameter } from "../idfConfiguration";
import { appendIdfAndToolsToPath, canAccessFile } from "../utils";
import { sleep } from "../utils";
import { TaskManager } from "../taskManager";
import { ESP } from "../config";
import { getVirtualEnvPythonPath } from "../pythonManager";
import { IDFMonitor } from "../espIdf/monitor";
import { OutputCapturingExecution } from "../taskManager/customExecution";

export class EraseFlashTask {
  public static isErasing: boolean;
  private currentWorkspace: Uri;
  private flashScriptPath: string;
  private idfPathDir: string;
  private modifiedEnv: { [key: string]: string };

  constructor(workspaceUri: Uri) {
    this.currentWorkspace = workspaceUri;
    this.idfPathDir = readParameter("idf.espIdfPath", workspaceUri) as string;
    this.flashScriptPath = join(
      this.idfPathDir,
      "components",
      "esptool_py",
      "esptool",
      "esptool.py"
    );
  }

  public erasing(flag: boolean) {
    EraseFlashTask.isErasing = flag;
  }

  private verifyArgs() {
    if (!canAccessFile(this.flashScriptPath, constants.R_OK)) {
      throw new Error("SCRIPT_PERMISSION_ERROR");
    }
  }

  public async eraseFlash(port: string, captureOutput?: boolean) {
    if (EraseFlashTask.isErasing) {
      throw new Error("ALREADY_ERASING");
    }

    this.verifyArgs();

    // Stop monitor if running
    if (IDFMonitor.terminal) {
      IDFMonitor.terminal.sendText(ESP.CTRL_RBRACKET);
      const monitorDelay = readParameter(
        "idf.monitorDelay",
        this.currentWorkspace
      ) as number;
      await sleep(monitorDelay);
    }

    const notificationMode = readParameter(
      "idf.notificationMode",
      this.currentWorkspace
    ) as string;
    const pythonBinPath = await getVirtualEnvPythonPath(this.currentWorkspace);
    const currentWorkspaceFolder = workspace.workspaceFolders.find(
      (w) => w.uri === this.currentWorkspace
    );
    const showTaskOutput =
      notificationMode === NotificationMode.All ||
      notificationMode === NotificationMode.Output
        ? TaskRevealKind.Always
        : TaskRevealKind.Silent;

    this.modifiedEnv = await appendIdfAndToolsToPath(this.currentWorkspace);

    const eraseExecution = this._eraseExecution(
      pythonBinPath,
      port,
      captureOutput
    );
    const erasePresentationOptions = {
      reveal: showTaskOutput,
      showReuseMessage: false,
      clear: false,
      panel: TaskPanelKind.Shared,
    } as TaskPresentationOptions;

    TaskManager.addTask(
      {
        type: "esp-idf",
        command: "ESP-IDF Erase Flash",
        taskId: "idf-erase-flash-task",
      },
      currentWorkspaceFolder || TaskScope.Workspace,
      "ESP-IDF Erase Flash",
      eraseExecution,
      ["espIdf"],
      erasePresentationOptions
    );
    return eraseExecution;
  }

  private _eraseExecution(
    pythonBinPath: string,
    port: string,
    captureOutput?: boolean
  ) {
    this.erasing(true);
    const args = [this.flashScriptPath, "-p", port, "erase_flash"];
    const processOptions = {
      cwd: this.currentWorkspace.fsPath || process.cwd(),
      env: this.modifiedEnv,
    };
    if (captureOutput) {
      return OutputCapturingExecution.create(
        pythonBinPath,
        args,
        processOptions
      );
    } else {
      return new ProcessExecution(pythonBinPath, args, processOptions);
    }
  }
}
