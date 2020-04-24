// Copyright 2019 Espressif Systems (Shanghai) CO LTD
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as vscode from "vscode";
import { appendIdfAndToolsToPath, execChildProcess } from "../utils";
import { OutputChannel } from "../logger/outputChannel";
import { Logger } from "../logger/logger";

export interface coverageOptions {
  type: string;
  task: string;
  args: string[];
}

export class coverageProvider {
  private workspaceFolder: vscode.Uri;
  constructor(workspaceFolder: vscode.Uri) {
    this.workspaceFolder = workspaceFolder;
  }

  public async buildJson() {
    const result = await this._runCmd("gcov", ["-r", ".", "--json"]);
    return JSON.parse(result);
  }

  public async buildHtml() {
    const result = await this._runCmd("gcov", ["-r", ".", "--html"]);
    return result;
  }

  private _runCmd(cmd: string, args: string[]) {
    const modifiedEnv = appendIdfAndToolsToPath();
    return execChildProcess(
      `${cmd} ${args.join(" ")}`,
      this.workspaceFolder.fsPath,
      OutputChannel.init(),
      { env: modifiedEnv }
    ).catch((e) => {
      Logger.error("Error on gcov cmd", e);
      return "";
    });
  }
}
