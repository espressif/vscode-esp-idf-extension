/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 12th July 2019 5:59:07 pm
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

import { ChildProcess, spawn } from "child_process";
import { EventEmitter } from "events";
import * as path from "path";
import * as vscode from "vscode";
import * as idfConf from "../../idfConfiguration";
import { Logger } from "../../logger/logger";
import { appendIdfAndToolsToPath, isBinInPath } from "../../utils";
import { getProjectName } from "../../workspaceConfig";

export interface IDebugAdapterConfig {
    currentWorkspace?: vscode.Uri;
    debugAdapterPort?: number;
    env?: NodeJS.ProcessEnv;
    logLevel?: number;
    projectName?: string;
    target?: string;
}

export class DebugAdapterManager extends EventEmitter {
    public static init(context: vscode.ExtensionContext): DebugAdapterManager {
        if (!DebugAdapterManager.instance) {
            DebugAdapterManager.instance = new DebugAdapterManager(context);
        }
        return DebugAdapterManager.instance;
    }
    private static instance: DebugAdapterManager;

    private port: number;
    private logLevel: number;
    private target: string;
    private env;
    private projectName: string;
    private debugAdapterPath: string;
    private adapter: ChildProcess;
    private chan: Buffer;
    private displayChan: vscode.OutputChannel;
    private currentWorkspace: vscode.Uri;

    private constructor(context: vscode.ExtensionContext) {
        super();
        this.configureWithDefaultValues(context.extensionPath);
        this.displayChan = vscode.window.createOutputChannel("ESP-IDF Debug Adapter");
        this.chan = Buffer.alloc(0);
    }

    public start() {
        return new Promise(async (resolve, reject) => {
            if (this.isRunning()) {
                return;
            }
            appendIdfAndToolsToPath();
            const workspace = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : "";
            if (!isBinInPath("openocd", workspace)) {
                throw new Error("Invalid OpenOCD bin path or access is denied for the user");
            }
            if (typeof process.env.OPENOCD_SCRIPTS === "undefined") {
                throw new Error("Invalid OpenOCD script path or access is denied for the user");
            }
            this.projectName = await getProjectName(this.currentWorkspace.fsPath);
            const elfPath = path.join(this.currentWorkspace.fsPath, "build", this.projectName) + ".elf";
            const logFile = path.join(this.currentWorkspace.fsPath, "debug") + ".log";

            const pythonBinPath = idfConf.readParameter("idf.pythonBinPath") as string;
            this.adapter = spawn(pythonBinPath, [
                this.debugAdapterPath,
                "-d", this.logLevel.toString(),
                "-e", elfPath,
                "-l", logFile,
                "-om", "connect_to_instance",
                "-p", this.port.toString(),
                "-dn", this.target,
            ], { env: this.env },
            );

            this.adapter.stderr.on("data", (data) => {
                data = typeof data === "string" ? Buffer.from(data) : data;
                this.sendToOutputChannel(data);
                this.displayChan.append(data.toString());
                this.emit("error", data, this.chan);
            });

            this.adapter.stdout.on("data", (data) => {
                data = typeof data === "string" ? Buffer.from(data) : data;
                this.sendToOutputChannel(data);
                this.displayChan.append(data.toString());
                this.emit("data", this.chan);
                if (data.toString().trim().endsWith("DEBUG_ADAPTER_READY2CONNECT")) {
                    resolve(true);
                }
            });

            this.adapter.on("error", (error) => {
                this.emit("error", error, this.chan);
                this.stop();
                reject();
            });

            this.adapter.on("close", (code: number, signal: string) => {
                if (!signal && code && code !== 0) {
                    Logger.errorNotify(`ESP-IDF Debug Adapter exit with error code ${code}`,
                        new Error("Spawn exit with non-zero" + code));
                }
                this.stop();
            });
            this.displayChan.clear();
            this.displayChan.show(true);
        });
    }

    public stop() {
        if (this.adapter && !this.adapter.killed) {
            this.adapter.kill("SIGKILL");
            this.adapter = undefined;
            this.displayChan.appendLine("[Stopped] : ESP-IDF Debug Adapter");
        }
    }

    public configureAdapter(config: IDebugAdapterConfig) {
        if (config.currentWorkspace) {
            this.currentWorkspace = config.currentWorkspace;
        }
        if (config.debugAdapterPort) {
            this.port = config.debugAdapterPort;
        }
        if (config.env) {
            for (const envVar of Object.keys(config.env)) {
                this.env[envVar] = config.env[envVar];
            }
        }
        if (config.logLevel) {
            this.logLevel = config.logLevel;
        }
        if (config.projectName) {
            this.projectName = config.projectName;
        }
        if (config.target) {
            this.target = config.target;
        }
    }

    public isRunning(): boolean {
        return this.adapter && !this.adapter.killed;
    }

    private configureWithDefaultValues(extensionPath: string) {
        this.currentWorkspace =
            vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri : undefined;
        this.projectName = "";
        this.debugAdapterPath = path.join(extensionPath, "esp_debug_adapter", "debug_adapter_main.py");
        this.port = 43474;
        this.logLevel = 0;
        this.target = idfConf.readParameter("idf.adapterTargetName");
        this.env = process.env;
    }

    private sendToOutputChannel(data: Buffer) {
        this.chan = Buffer.concat([this.chan, data]);
    }
}
