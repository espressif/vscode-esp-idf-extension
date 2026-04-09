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
import { Uri } from "vscode";
import { join } from "path";
import { constants } from "fs";
import { readParameter } from "../idfConfiguration";
import { canAccessFile, sleep } from "../utils";
import { addProcessTask } from "../taskManager";
import { ESP } from "../config";
import { getVirtualEnvPythonPath } from "../pythonManager";
import { IDFMonitor } from "../espIdf/monitor";
import { configureEnvVariables } from "../common/prepareEnv";

export class EraseFlashTask {
  public static isErasing: boolean;
  private currentWorkspace: Uri;

  constructor(workspaceUri: Uri) {
    this.currentWorkspace = workspaceUri;
  }

  public erasing(flag: boolean) {
    EraseFlashTask.isErasing = flag;
  }

  public async eraseFlash(port: string, captureOutput?: boolean) {
    if (EraseFlashTask.isErasing) {
      throw new Error("ALREADY_ERASING");
    }

    // Stop monitor if running
    if (IDFMonitor.terminal) {
      IDFMonitor.terminal.sendText(ESP.CTRL_RBRACKET);
      const monitorDelay = readParameter(
        "idf.monitorDelay",
        this.currentWorkspace
      ) as number;
      await sleep(monitorDelay);
    }

    const modifiedEnv = await configureEnvVariables(this.currentWorkspace);
    const flashScriptPath = join(
      modifiedEnv["IDF_PATH"],
      "components",
      "esptool_py",
      "esptool",
      "esptool.py"
    );

    if (!canAccessFile(flashScriptPath, constants.R_OK)) {
      throw new Error("SCRIPT_PERMISSION_ERROR");
    }

    const pythonBinPath = await getVirtualEnvPythonPath();
    this.erasing(true);
    const args = [flashScriptPath, "-p", port, "erase_flash"];
    return addProcessTask(
      "Erase Flash",
      this.currentWorkspace,
      pythonBinPath,
      args,
      this.currentWorkspace.fsPath || process.cwd(),
      modifiedEnv,
      { captureOutput }
    );
  }
}
