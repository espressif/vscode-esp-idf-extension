/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 15th August 2019 9:17:30 pm
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

import { constants } from "fs";
import { join } from "path";
import * as vscode from "vscode";

import { AbstractTracingToolManager } from "./abstractTracingToolManager";

export class SysviewTraceProc extends AbstractTracingToolManager {
  constructor(workspaceRoot: vscode.Uri, traceFilePath: string) {
    super(workspaceRoot, traceFilePath);
  }

  public async parse(): Promise<Buffer> {
    if (!this.preCheck([this.traceFilePath], constants.R_OK)) {
      throw new Error("Trace file does not exists or not accessible");
    }
    if (
      !this.preCheck(
        [join(this.appTraceToolsPath(), "sysviewtrace_proc.py")],
        constants.X_OK
      )
    ) {
      throw new Error(
        "sysviewtrace_proc.py tool is not found or not accessible"
      );
    }
    return await this.parseInternal(
      "python",
      ["sysviewtrace_proc.py", "-j", "-b", `file://${this.elfFilePath}`, `file://${this.traceFilePath}`],
      {
        cwd: this.appTraceToolsPath(),
      }
    );
  }
}
