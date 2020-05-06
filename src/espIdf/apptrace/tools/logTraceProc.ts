/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 18th July 2019 12:02:14 pm
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

import { existsSync } from "fs";
import * as vscode from "vscode";

import { join } from "path";
import * as idfConf from "../../../idfConfiguration";
import { appendIdfAndToolsToPath, spawn } from "../../../utils";

export class LogTraceProc {
  private readonly traceFilePath: string;
  private readonly elfFilePath: string;
  private readonly workspaceRoot: vscode.Uri;

  constructor(
    workspaceRoot: vscode.Uri,
    traceFilePath: string,
    elfFilePath: string
  ) {
    this.workspaceRoot = workspaceRoot;
    this.traceFilePath = traceFilePath;
    this.elfFilePath = elfFilePath;
  }

  public async parse(): Promise<Buffer> {
    if (!existsSync(this.elfFilePath)) {
      throw new Error(`Elf file doesn't exists, ${this.elfFilePath}`);
    }
    if (!existsSync(this.traceFilePath)) {
      throw new Error(`Trace file doesn't exists, ${this.traceFilePath}`);
    }
    const pythonBinPath = idfConf.readParameter("idf.pythonBinPath") as string;
    const modifiedEnv = appendIdfAndToolsToPath();
    return await spawn(
      pythonBinPath,
      ["logtrace_proc.py", this.traceFilePath, this.elfFilePath],
      {
        cwd: this.appTraceToolsPath(),
        env: modifiedEnv,
      }
    );
  }

  private appTraceToolsPath(): string {
    const idfPathDir = idfConf.readParameter("idf.espIdfPath");
    return join(idfPathDir, "tools", "esp_app_trace");
  }
}
