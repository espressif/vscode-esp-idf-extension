/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 8th July 2019 11:18:09 am
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

import { fileExists } from "../../utils";

export interface IOpenOCDConfig {
    binPath: string;
    scriptPath: string;
    deviceInterface: string;
    board: string;
}

export class OpenOCDController extends EventEmitter {
    private readonly binPath: string;
    private readonly scriptPath: string;
    private readonly deviceInterface: string;
    private readonly board: string;
    private server: ChildProcess;
    private chan: Buffer;

    constructor(openOCDConfig: IOpenOCDConfig) {
        super();
        this.binPath = openOCDConfig.binPath;
        this.scriptPath = openOCDConfig.scriptPath;
        this.deviceInterface = openOCDConfig.deviceInterface;
        this.board = openOCDConfig.board;
        this.chan = Buffer.alloc(0);
    }

    public async startServer() {
        if (this.server && this.server.connected) {
            return;
        }
        if (!fileExists(this.binPath)) {
            throw new Error("Invalid OpenOCD bin path");
        }
        if (!fileExists(this.scriptPath)) {
            throw new Error("Invalid OpenOCD script path");
        }
        this.server = spawn(this.binPath, [
            "-s", this.scriptPath,
            "-f", this.deviceInterface,
            "-f", this.board,
        ]);
        this.server.stderr.on("data", (data) => {
            data = typeof data === "string" ? Buffer.from(data) : data;
            this.sendToOutputChannel(data);
            this.emit("error", this.chan, new Error("STDERR_CHAN_RECV"));

        });
        this.server.stdout.on("data", (data) => {
            // tslint:disable-next-line: no-console
            console.log(data.toString());
            data = typeof data === "string" ? Buffer.from(data) : data;
            this.sendToOutputChannel(data);
            this.emit("data", this.chan);
        });
        this.server.on("error", (error) => {
            this.emit("error", this.chan, error);
        });
        this.server.on("close", (code: number, signal: string) => {
            // tslint:disable-next-line: no-console
            console.log("disconnect");
        });
        this.server.on("exit", (code: number, signal: string) => {
            // tslint:disable-next-line: no-console
            console.log("disconnect");
        });
    }

    public stop() {
        if (this.server && !this.server.killed) {
            this.server.kill("SIGKILL");
        }
    }

    private sendToOutputChannel(data: Buffer) {
        this.chan = Buffer.concat([this.chan, data]);
    }
}
