/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 15th August 2019 9:17:30 pm
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

import { constants, existsSync } from "fs";
import { basename, dirname, join } from "path";
import * as vscode from "vscode";

import { AbstractTracingToolManager } from "./abstractTracingToolManager";

const CORE_SUFFIX = /^(.+\.svdat)_core\d+$/i;

// Prefer OpenOCD per-core dumps (*.svdat_coreN). Passing them skips the
// Windows multicore-split path in sysviewtrace_proc.py.
export function resolveTraceSources(traceFilePath: string): string[] {
  const directory = dirname(traceFilePath);
  const baseName = stripCoreSuffix(basename(traceFilePath));
  const coreSources: string[] = [];
  for (let core = 0; ; core++) {
    const coreFile = join(directory, `${baseName}_core${core}`);
    if (!existsSync(coreFile)) {
      break;
    }
    coreSources.push(toFileUrl(coreFile));
  }
  return coreSources.length > 0 ? coreSources : [toFileUrl(traceFilePath)];
}

function stripCoreSuffix(fileName: string): string {
  const match = CORE_SUFFIX.exec(fileName);
  return match ? match[1] : fileName;
}

function toFileUrl(filePath: string): string {
  return `file://${filePath.replace(/\\/g, "/")}`;
}

export class SysviewTraceProc extends AbstractTracingToolManager {
  constructor(
    workspaceRoot: vscode.Uri,
    traceFilePath: string,
    elfFilePath?: string
  ) {
    super(workspaceRoot, traceFilePath, elfFilePath);
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
    const args = ["sysviewtrace_proc.py", "-j"];
    if (this.elfFilePath) {
      // -b expects a filesystem path (not file://), matching IDF / Eclipse usage
      args.push("-b", this.elfFilePath);
    }
    args.push(...resolveTraceSources(this.traceFilePath));
    return await this.parseInternal("python", args, {
      cwd: this.appTraceToolsPath(),
    });
  }
}
