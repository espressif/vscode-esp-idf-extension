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

import { constants } from "fs";
import { join } from "path";

import { AbstractTracingToolManager } from "./abstractTracingToolManager";

export class LogTraceProc extends AbstractTracingToolManager {
  public async parse(): Promise<Buffer> {
    if (
      !this.preCheck([this.elfFilePath, this.traceFilePath], constants.R_OK)
    ) {
      throw new Error(
        "Elf File or Trace file does not exists or not accessible"
      );
    }
    if (
      !this.preCheck(
        [join(this.appTraceToolsPath(), "logtrace_proc.py")],
        constants.X_OK
      )
    ) {
      throw new Error(
        "logtrace_proc.py tool does not exists or is not accessible"
      );
    }
    return await this.parseInternal(
      "python",
      ["logtrace_proc.py", this.traceFilePath, this.elfFilePath],
      {
        cwd: this.appTraceToolsPath()
      }
    );
  }
}
