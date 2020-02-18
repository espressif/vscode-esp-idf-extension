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
import * as vscode from "vscode";
import * as idfConf from "../../idfConfiguration";
import { Logger } from "../../logger/logger";
import { appendIdfAndToolsToPath, isBinInPath } from "../../utils";

export interface IOpenOCDConfig {
    openOcdConfigFilesList: string[];
}

export class OpenOCDManager extends EventEmitter {
    public static init(): OpenOCDManager {
        if (!OpenOCDManager.instance) {
            OpenOCDManager.instance = new OpenOCDManager();
        }
        return OpenOCDManager.instance;
    }
    private static instance: OpenOCDManager;

    private openOcdConfigFilesList: string[];
    private server: ChildProcess;
    private chan: Buffer;
    private displayChan: vscode.OutputChannel;
    private statusBar: vscode.StatusBarItem;

    private constructor() {
        super();
        this.configureServerWithDefaultParam();
        this.chan = Buffer.alloc(0);
        this.displayChan = vscode.window.createOutputChannel("OpenOCD");
        this.registerOpenOCDStatusBarItem();
    }

    public statusBarItem(): vscode.StatusBarItem {
        return this.statusBar;
    }

    public updateStatusText(text: string) {
        this.statusBar.text = text;
        this.statusBar.show();
    }

    public async commandHandler() {
        const openOCDCommandSelectionPick = [];
        if (!OpenOCDManager.instance.isRunning()) {
            openOCDCommandSelectionPick.push({ label: "Start OpenOCD", description: "" });
        } else {
            openOCDCommandSelectionPick.push({ label: "Stop OpenOCD", description: "Running" });
        }
        const pick = await vscode.window.showQuickPick(openOCDCommandSelectionPick);
        if (!pick) {
            return false;
        }
        try {
            switch (pick.label) {
                case "Start OpenOCD":
                    await OpenOCDManager.instance.start();
                    break;
                case "Stop OpenOCD":
                    OpenOCDManager.instance.stop();
                    break;
                default:
                    break;
            }
        } catch (error) {
            Logger.errorNotify(error.message, error);
        }
        return true;
    }

    public configureServer(config: IOpenOCDConfig) {
        this.openOcdConfigFilesList = config.openOcdConfigFilesList;
    }

    public isRunning(): boolean {
        return this.server && !this.server.killed;
    }

    public async start() {
        if (this.isRunning()) {
            return;
        }
        appendIdfAndToolsToPath();
        const workspace = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : "";
        if (!isBinInPath("openocd", workspace)) {
            throw new Error("Invalid OpenOCD bin path or access is denied for the user");
        }
        if (typeof process.env.OPENOCD_SCRIPTS === "undefined") {
            throw new Error("OPENOCD_SCRIPTS environment variable is missing. Please set it in idf.customExtraVars or in your system environment variables.");
        }

        if (typeof this.openOcdConfigFilesList === "undefined" || this.openOcdConfigFilesList.length < 1) {
            throw new Error("Invalid OpenOCD Config files. Check idf.openOcdConfigs configuration value.");
        }

        const openOcdArgs = [];
        this.openOcdConfigFilesList.forEach((configFile) => {
            openOcdArgs.push("-f");
            openOcdArgs.push(configFile);
        });

        this.server = spawn("openocd", openOcdArgs, {
            cwd: workspace,
        });
        this.server.stderr.on("data", (data) => {
            data = typeof data === "string" ? Buffer.from(data) : data;
            this.sendToOutputChannel(data);
            const regex = /Error: (?!type '.+' is missing virt2phys).+/i;
            // virt2phys will be removed soon in openocd. ignoring
            const errStr = data.toString();
            const matchArr = errStr.match(regex);
            if (!matchArr) {
                this.emit("data", this.chan);
            } else {
                const errorMsg = `OpenOCD server failed to start because of ${matchArr.join(" ")}`;
                const err = new Error(errorMsg);
                this.displayChan.append(`❌ ${errStr}`);
                this.emit("error", err, this.chan);
            }
            this.displayChan.append(errStr);
        });
        this.server.stdout.on("data", (data) => {
            data = typeof data === "string" ? Buffer.from(data) : data;
            this.sendToOutputChannel(data);
            this.emit("data", this.chan);
        });
        this.server.on("error", (error) => {
            this.emit("error", error, this.chan);
            this.stop();
        });
        this.server.on("close", (code: number, signal: string) => {
            if (!signal && code && code !== 0) {
                Logger.errorNotify(
                    `OpenOCD Exit with non-zero error code ${code}`,
                    new Error("Spawn exit with non-zero" + code),
                );
            }
            this.stop();
        });
        this.updateStatusText("❇️ OpenOCD Server (Running)");
        this.displayChan.clear();
        this.displayChan.show(true);
    }

    public stop() {
        if (this.server && !this.server.killed) {
            this.server.kill("SIGKILL");
            this.server = undefined;
            this.updateStatusText("❌ OpenOCD Server (Stopped)");
            this.displayChan.appendLine("[Stopped] : OpenOCD Server");
        }
    }

    private registerOpenOCDStatusBarItem() {
        this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1000);
        this.statusBar.text = "[OpenOCD Server]";
        this.statusBar.command = "espIdf.openOCDCommand";
        this.statusBar.show();
    }

    private configureServerWithDefaultParam() {
        this.openOcdConfigFilesList = idfConf.readParameter("idf.openOcdConfigs");
    }

    private sendToOutputChannel(data: Buffer) {
        this.chan = Buffer.concat([this.chan, data]);
    }
}
