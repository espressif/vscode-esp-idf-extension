/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 15th August 2019 9:32:08 pm
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

import { join } from "path";
import * as vscode from "vscode";

import * as idfConf from "../../../idfConfiguration";
import { appendIdfAndToolsToPath, canAccessFile, spawn } from "../../../utils";

export abstract class AbstractTracingToolManager {
  protected readonly traceFilePath: string;
  protected readonly elfFilePath: string;
  protected readonly workspaceRoot: vscode.Uri;

  constructor(
    workspaceRoot: vscode.Uri,
    traceFilePath?: string,
    elfFilePath?: string
  ) {
    this.workspaceRoot = workspaceRoot;
    this.traceFilePath = traceFilePath;
    this.elfFilePath = elfFilePath;
  }

  protected async parseInternal(
    command: string,
    args?: string[],
    option?: any
  ) {
    const modifiedEnv = await appendIdfAndToolsToPath(this.workspaceRoot);
    option.env = option.env || modifiedEnv;
    return await spawn(command, args, option);
  }

  protected appTraceToolsPath(): string {
    const customExtraVars = idfConf.readParameter(
      "idf.customExtraVars",
      this.workspaceRoot
    ) as { [key: string]: string };
    const idfPathDir = customExtraVars["IDF_PATH"];
    return join(idfPathDir, "tools", "esp_app_trace");
  }

  protected preCheck(filePaths: string[], mode: number): boolean {
    let didPassAll = true;
    filePaths.forEach((filePath) => {
      if (!canAccessFile(filePath, mode)) {
        didPassAll = false;
      }
    });
    return didPassAll;
  }
}
