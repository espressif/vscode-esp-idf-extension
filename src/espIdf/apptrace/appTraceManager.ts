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
                    const workspace = vscode.workspace.workspaceFolders[0].uri.path;
                    this.sendCommandToTelnetSession(
                        `esp32 apptrace start file://${join(workspace, ".trace")}/trace_${new Date().getTime()}.trace`,
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
        const workspace = vscode.workspace.workspaceFolders[0].uri.path;
        if (!fileExists(join(workspace, ".trace"))) {
            mkdirSync(join(workspace, ".trace"));
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
