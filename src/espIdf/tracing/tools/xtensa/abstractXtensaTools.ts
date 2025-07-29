/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 22nd August 2019 6:11:02 pm
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

import * as vscode from "vscode";
import { Logger } from "../../../../logger/logger";
import { appendIdfAndToolsToPath, getToolchainToolName, spawn } from "../../../../utils";
import { getIdfTargetFromSdkconfig } from "../../../../workspaceConfig";

export abstract class XtensaTools {
  protected readonly workspaceRoot: vscode.Uri;

  constructor(workspaceRoot: vscode.Uri, private toolName: string) {
    this.workspaceRoot = workspaceRoot;
  }
  
  protected async call(args: string[]): Promise<Buffer> {
    const env = await appendIdfAndToolsToPath(this.workspaceRoot);
    const toolName = await this.toolNameForTarget(this.toolName);
    try {
      return await spawn(toolName, args, { env });
    } catch (error) {
      Logger.errorNotify(
        `Make sure ${this.toolName} is set in the Path with proper permission`,
        error,
        "XtensaTools call"
      );
    }
  }

  private async  toolNameForTarget(toolName: string) {
    let idfTarget = await getIdfTargetFromSdkconfig(this.workspaceRoot);
    const toolNameResult = getToolchainToolName(idfTarget, toolName);
    return toolNameResult ? toolNameResult : `unknown-tracing-tool`;
  }
}
