/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 8th July 2019 11:18:25 am
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

import { EventEmitter } from "events";
import { mkdirSync } from "fs";
import { join } from "path";
import * as Telnet from "telnet-client";
import * as vscode from "vscode";
import * as idfConf from "../../idfConfiguration";
import { Logger } from "../../logger/logger";
import { fileExists } from "../../utils";
import { OpenOCDManager } from "../openOcd/openOcdManager";
import { AppTraceArchiveTreeDataProvider } from "./tree/appTraceArchiveTreeDataProvider";
import { AppTraceTreeDataProvider } from "./tree/appTraceTreeDataProvider";

export interface IAppTraceManagerConfig {
    host: string;
    port: number;
    timeout?: number;
    shellPrompt?: string;
}

export class AppTraceManager extends EventEmitter {

    public static async saveConfiguration(workspaceRoot: vscode.Uri) {
        await this.configHelper(
            "Data polling period for apptrace",
            "milliseconds",
            "trace.poll_period",
            workspaceRoot,
            (value: string): string => {
                if (value.match(/^[0-9]*$/g)) {
                    return "";
                }
                return "Invalid poll_period value, please enter only number";
            },
        );
        await this.configHelper(
            "Maximum size of data to be collected",
            "bytes",
            "trace.trace_size",
            workspaceRoot,
            (value: string): string => {
                if (value.match(/^(?:-1|[0-9]*)$/g)) {
                    return "";
                }
                return "Invalid trace_size value, only -1 or positive integer allowed";
            },
        );
        await this.configHelper(
            "Idle timeout for apptrace",
            "seconds",
            "trace.stop_tmo",
            workspaceRoot,
            (value: string): string => {
                if (value.match(/^[0-9]*$/g)) {
                    return "";
                }
                return "Invalid stop_tmo value, please enter only number";
            },
        );
        await this.configHelper(
            "Should wait for halt?",
            "0 = Starts Immediately; else wait",
            "trace.wait4halt",
            workspaceRoot,
            (value: string): string => {
                if (value.match(/^[0-9]*$/g)) {
                    return "";
                }
                return "Invalid wait4halt value, please enter only number";
            },
        );
        await this.configHelper(
            "Number of bytes to skip at the start",
            "bytes",
            "trace.skip_size",
            workspaceRoot,
            (value: string): string => {
                if (value.match(/^[0-9]*$/g)) {
                    return "";
                }
                return "Invalid skip_size value, please enter only number";
            },
        );
    }

    private static async configHelper(
        prompt: string,
        placeholder: string,
        paramName: string,
        workspaceRoot: vscode.Uri,
        validatorFunction: (value: string) => string,
    ) {
        const confSaved = idfConf.readParameter(paramName, workspaceRoot);
        const skipSize = await vscode.window.showInputBox({
            placeHolder: placeholder,
            value: confSaved,
            prompt,
            ignoreFocusOut: true,
            validateInput: validatorFunction,
        });
        // tslint:disable-next-line: no-unused-expression
        skipSize ? idfConf.writeParameter(paramName, skipSize, workspaceRoot) : undefined;
    }

    private controller: Telnet;
    private treeDataProvider: AppTraceTreeDataProvider;
    private archiveDataProvider: AppTraceArchiveTreeDataProvider;

    constructor(treeDataProvider: AppTraceTreeDataProvider, archiveDataProvider: AppTraceArchiveTreeDataProvider) {
        super();
        this.controller = new Telnet();
        this.treeDataProvider = treeDataProvider;
        this.archiveDataProvider = archiveDataProvider;
        this.registerTelnetDataReceiver();
    }

    public async start() {
        try {
            if (await this.promptUserToLaunchOpenOCDServer()) {
                this.treeDataProvider.showStopButton();
                setTimeout(async () => {
                    // tslint:disable-next-line: max-line-length
                    const workspace = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri : undefined;
                    const pollPeriod = idfConf.readParameter("trace.poll_period", workspace);
                    const traceSize = idfConf.readParameter("trace.trace_size", workspace);
                    const stopTmo = idfConf.readParameter("trace.stop_tmo", workspace);
                    const wait4halt = idfConf.readParameter("trace.wait4halt", workspace);
                    const skipSize = idfConf.readParameter("trace.skip_size", workspace);
                    this.sendCommandToTelnetSession(
                        // tslint:disable-next-line: max-line-length
                        `esp32 apptrace start file://${join(workspace ? workspace.path : "", "trace")}/trace_${new Date().getTime()}.trace ${pollPeriod} ${traceSize} ${stopTmo} ${wait4halt} ${skipSize}`,
                    );
                }, 2000);
            }
        } catch (error) {
            Logger.errorNotify(error.message, error);
        }
    }

    public async stop() {
        await this.sendCommandToTelnetSession("esp32 apptrace stop");
        this.treeDataProvider.showStartButton();
        this.archiveDataProvider.populateArchiveTree();
        await this.controller.end();
    }

    private async promptUserToLaunchOpenOCDServer() {
        const openOCDManager = OpenOCDManager.init();
        if (!openOCDManager.isRunning()) {
            Logger.warnNotify("Launch OpenOCD Server before starting app trace");
            return false;
        }
        return true;
    }

    private async connectTelnetSession(config: IAppTraceManagerConfig) {
        return await this.controller.connect({
            shellPrompt: config.shellPrompt || ">",
            timeout: config.timeout || 5000,
            host: config.host,
            port: config.port,
        });
    }
    private async sendCommandToTelnetSession(command: string) {
        await this.connectTelnetSession({ host: "127.0.0.1", port: 4444 });
        const workspace = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.path : "";
        if (!fileExists(join(workspace, "trace"))) {
            mkdirSync(join(workspace, "trace"));
        }
        return await this.controller.exec(command);
    }
    private registerTelnetDataReceiver() {
        this.controller.on("data", (d) => {
            try {
                const isProgress = d.toString().split("\n")[0].match(/[0-9].*/gm);
                if (isProgress && this.treeDataProvider.appTraceStartButton.label.match(/stop/gi)) {
                    this.treeDataProvider.updateDescription(isProgress[0].trim());
                }
            } catch (error) {
                Logger.error("Failed to extract the progress from apptrace", error);
            }
        });
    }
}
