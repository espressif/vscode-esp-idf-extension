/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 8th August 2019 6:41:01 pm
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
import * as vscode from "vscode";

import { mkdirSync } from "fs";
import { join } from "path";
import { Logger } from "../../logger/logger";
import { fileExists, getElfFilePath, sleep } from "../../utils";
import { OpenOCDManager } from "../openOcd/openOcdManager";
import { TCLClient } from "../openOcd/tcl/tclClient";
import { Nm } from "./tools/xtensa/nm";
import { AppTraceArchiveTreeDataProvider } from "./tree/appTraceArchiveTreeDataProvider";
import { AppTraceButtonType, AppTraceTreeDataProvider } from "./tree/appTraceTreeDataProvider";

export class HeapTraceManager extends EventEmitter {
    private treeDataProvider: AppTraceTreeDataProvider;
    private archiveDataProvider: AppTraceArchiveTreeDataProvider;
    private heapTraceNotificationTCLClientHandler: TCLClient;
    private heapTraceCommandChainTCLClientHandler: TCLClient;
    private heapTraceChannel: vscode.OutputChannel;

    constructor(treeDataProvider: AppTraceTreeDataProvider, archiveDataProvider: AppTraceArchiveTreeDataProvider) {
        super();
        this.treeDataProvider = treeDataProvider;
        this.archiveDataProvider = archiveDataProvider;
        const tclConnectionParams = { host: "localhost", port: 6666 };
        this.heapTraceNotificationTCLClientHandler = new TCLClient(tclConnectionParams);
        this.heapTraceCommandChainTCLClientHandler = new TCLClient(tclConnectionParams);
        this.heapTraceChannel = vscode.window.createOutputChannel("Heap Trace");
    }

    public async start() {
        try {
            if (await OpenOCDManager.init().promptUserToLaunchOpenOCDServer()) {
                this.heapTraceChannel.clear();
                this.showStopButton();
                const workspace = vscode.workspace.workspaceFolders ?
                    vscode.workspace.workspaceFolders[0].uri.fsPath : "";
                if (!fileExists(join(workspace, "trace"))) {
                    mkdirSync(join(workspace, "trace"));
                }
                const addresses = await this.getAddressFor(["heap_trace_start", "heap_trace_stop"]);
                const fileName = `file://${join(workspace, "trace")}/htrace_${new Date().getTime()}.svdat`;
                const commandChain = new CommandChain();
                commandChain
                    .buildCommand("reset halt")
                    .buildCommand(`bp 0x${addresses.heap_trace_start} 4 hw`)
                    .buildCommand(`bp 0x${addresses.heap_trace_stop} 4 hw`)
                    .buildCommand("resume")
                    .buildCommand(`rbp 0x${addresses.heap_trace_start}`)
                    .buildCommand(`esp32 sysview start ${fileName}`)
                    .buildCommand("resume")
                    .buildCommand(`rbp 0x${addresses.heap_trace_stop}`)
                    .buildCommand("esp32 sysview stop");
                this.heapTraceNotificationTCLClientHandler.on("response", (resp: Buffer) => {
                    this.heapTraceChannel.appendLine("->> " + resp);
                });
                this.heapTraceNotificationTCLClientHandler.sendCommandWithCapture("tcl_notifications on");

                this.heapTraceCommandChainTCLClientHandler.on("response", async (resp: Buffer) => {
                    this.heapTraceChannel.appendLine(">> " + resp);
                    const cmd = commandChain.next();
                    if (!cmd) {
                        this.heapTraceNotificationTCLClientHandler.stop();
                        this.heapTraceCommandChainTCLClientHandler.stop();
                        this.archiveDataProvider.populateArchiveTree();
                        this.showStartButton();
                        return;
                    }
                    await sleep(5000);
                    this.heapTraceCommandChainTCLClientHandler.sendCommandWithCapture(cmd);
                });
                await sleep(1000);
                this.heapTraceCommandChainTCLClientHandler.sendCommandWithCapture(commandChain.next());
            }
        } catch (error) {
            Logger.errorNotify(error.message, error);
        }
    }

    public async stop() {
        try {
            if (await OpenOCDManager.init().promptUserToLaunchOpenOCDServer()) {
                this.showStartButton();
                this.heapTraceNotificationTCLClientHandler.stop();
                this.heapTraceCommandChainTCLClientHandler.stop();
            }
        } catch (error) {
            Logger.errorNotify(error.message, error);
        }
    }

    private showStopButton() {
        this.treeDataProvider.showStopButton(AppTraceButtonType.HeapTraceButton);
    }
    private showStartButton() {
        this.treeDataProvider.showStartButton(AppTraceButtonType.HeapTraceButton);
    }

    private async getAddressFor(symbols: string[]): Promise<any> {
        const emptyURI: vscode.Uri = undefined;
        const workspaceRoot = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri : emptyURI;
        const elfFile = await getElfFilePath(workspaceRoot);
        const nm = new Nm(workspaceRoot, elfFile);
        const resp = await nm.run();
        const respStr = resp.toString();
        const respArr = respStr.split("\n");
        const lookUpTable = {};
        respArr.forEach((line) => {
            const lineArr = line.trim().split(/\s+/);
            lookUpTable[lineArr[2]] = lineArr[0];
        });
        const respObj = {};
        symbols.forEach((symbol) => {
            respObj[symbol] = lookUpTable[symbol];
        });
        return respObj;
    }
}

// tslint:disable-next-line: max-classes-per-file
class CommandChain {
    private chain: string[];
    constructor() {
        this.chain = new Array<string>();
    }

    public buildCommand(command: string): CommandChain {
        this.chain.push(command);
        return this;
    }

    public next(): string {
        return this.chain.shift();
    }
}
