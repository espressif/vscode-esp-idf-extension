/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 21st June 2019 10:57:18 am
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

import * as path from "path";
import * as vscode from "vscode";
import * as idfConf from "../../idfConfiguration";
import { Logger } from "../../logger/logger";
import { fileExists, spawn } from "../../utils";

export class IDFSize {
    private readonly workspaceRoot: vscode.Uri;
    private isCanceled: boolean;
    constructor(workspaceRoot: vscode.Uri) {
        this.workspaceRoot = workspaceRoot;
    }
    public cancel() {
        this.isCanceled = true;
     }
    public async calculateWithProgress(progress: vscode.Progress<{ message: string, increment: number }>) {
        if (this.isCanceled) {
            throw new Error("calculate() on canceled context is not allowed!");
        }
        if (!this.isBuiltAlready()) {
            throw new Error("Build is required for a size analysis, build your project first");
        }
        try {
            const mapFilePath = this.mapFilePath();

            const overview = await this.idfCommandInvoker(["idf_size.py", mapFilePath, "--json"]);
            progress.report({ increment: 30, message: "Gathering Overview" });

            const archives = await this.idfCommandInvoker(["idf_size.py", mapFilePath, "--archives", "--json"]);
            progress.report({ increment: 30, message: "Gathering Archive List" });

            const files = await this.idfCommandInvoker(["idf_size.py", mapFilePath, "--file", "--json"]);
            progress.report({ increment: 30, message: "Calculating File Sizes for all the archives" });

            return { archives, files, overview };
        } catch (error) {
            throw error;
        }
    }

    private mapFilePath(): string {
        const projectName = idfConf.readParameter("idf.projectName", this.workspaceRoot);
        return path.join(this.workspaceRoot.fsPath, "build", `${projectName}.map`);
    }

    private idfPath(): string {
        const idfPathDir = idfConf.readParameter("idf.espIdfPath", this.workspaceRoot);
        return path.join(idfPathDir, "tools");
    }

    private isBuiltAlready(): boolean {
        return fileExists(this.mapFilePath());
    }

    private async idfCommandInvoker(args: string[]) {
        const idfPath = this.idfPath();
        try {
            const buffOut = await spawn("python", args, {
                cwd: idfPath,
            });
            const buffStr = buffOut.toString();
            const buffObj = JSON.parse(buffStr);
            return buffObj;
        } catch (error) {
            const throwableError =  new Error("Some error occurred while computing the idf_size!");
            Logger.error(error.message, error);
            throw throwableError;
        }
    }
}
