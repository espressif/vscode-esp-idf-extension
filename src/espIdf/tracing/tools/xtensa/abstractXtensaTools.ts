/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 22nd August 2019 6:11:02 pm
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

import * as vscode from "vscode";
import * as idfConf from "../../../../idfConfiguration";
import { Logger } from "../../../../logger/logger";
import { appendIdfAndToolsToPath, spawn } from "../../../../utils";

export abstract class XtensaTools {

    protected readonly workspaceRoot: vscode.Uri;
    protected readonly toolName: string;

    constructor(workspaceRoot: vscode.Uri, toolName: string) {
        this.workspaceRoot = workspaceRoot;
        this.toolName = this.toolNameForTarget(toolName);
    }

    protected async call(args: string[]): Promise<Buffer> {
        appendIdfAndToolsToPath();
        try {
            return await spawn(this.toolName, args);
        } catch (error) {
            Logger.errorNotify(`Make sure ${this.toolName} is set in the Path with proper permission`, error);
        }
    }

    private toolNameForTarget(toolName: string): string {
        const target = idfConf.readParameter("idf.adapterTargetName");
        if (target) {
            return `xtensa-${target}-elf-${toolName}`;
        }
        return `xtensa-esp32-elf-${toolName}`; // fallback default
    }
}
