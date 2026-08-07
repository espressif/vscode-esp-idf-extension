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
    this.requireAccessible(
      [this.elfFilePath!, this.traceFilePath!],
      constants.R_OK
    );
    const toolPath = join(this.appTraceToolsPath(), "logtrace_proc.py");
    this.requireExecutableTool(toolPath, "logtrace_proc.py");
    return await this.parseInternal(
      "python",
      ["logtrace_proc.py", this.traceFilePath!, this.elfFilePath!],
      {
        cwd: this.appTraceToolsPath(),
      }
    );
  }
}
