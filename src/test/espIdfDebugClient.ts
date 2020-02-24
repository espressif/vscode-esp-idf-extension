/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 5th June 2019 2:03:34 pm
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

import * as cp from "child_process";
import * as net from "net";
import { ProtocolClient } from "vscode-debugadapter-testsupport/lib/protocolClient";
import { DebugProtocol } from "vscode-debugprotocol";

export class EspIdfDebugClient extends ProtocolClient {

    private static CRLF = "\r\n\r\n";
    private runtime: string;
    private execArgs: string[];
    private adapterProcess: cp.ChildProcess;
    private spawnOptions: cp.SpawnOptions;
    private enableStderr: boolean;
    private debugType: string;
    private socket: net.Socket;
    private newRawData = Buffer.alloc(0);
    private newContentLength: number;

    constructor(
        runtime: string,
        execArgs: string[], debugType: string,
        spawnOptions?: cp.SpawnOptions,
        enableStderr?: boolean) {
            // super(runtime, execArgs.join(" "), debugType, spawnOptions, enableStderr);
            super();
            this.runtime = runtime;
            this.execArgs = execArgs;
            this.spawnOptions = spawnOptions;
            this.enableStderr = enableStderr;
            this.debugType = debugType;
            this.newContentLength = -1;
    }
    /**
     * Starts a new debug adapter and sets up communication via stdin/stdout.
     * If a port number is specified the adapter is not launched but a connection to
     * a debug adapter running in server mode is established. This is useful for debugging
     * the adapter while running tests. For this reason all timeouts are disabled in server mode.
     */
    public startClient(port?: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (typeof port === "number") {
                this.socket = net.createConnection(port, "127.0.0.1", () => {
                    this.connect(this.socket, this.socket);
                    resolve();
                });
            } else {
                this.adapterProcess = cp.spawn(this.runtime, this.execArgs, this.spawnOptions);
                const sanitize = (s: string) => s.toString().replace(/\r?\n$/mg, "");
                this.adapterProcess.stderr.on("data", (data: string) => {
                    if (this.enableStderr) {
                        // tslint:disable-next-line: no-console
                        console.log(sanitize(data));
                    }
                });

                this.adapterProcess.stdout.on("data", (data: Buffer) => {
                    this.newHandleData(data);
                });

                this.adapterProcess.on("error", (err) => {
                    reject(err);
                });
                this.adapterProcess.on("exit", (code: number, signal: string) => {
                    if (code) {
                        // done(new Error('debug adapter exit code: ' + code));
                    }
                });

                this.connect(this.adapterProcess.stdout, this.adapterProcess.stdin);
                resolve();
            }
        });
    }

    public stop(): Promise<void> {
        return this.disconnectRequest().then(() => {
            this.stopAdapter();
        }).catch(() => {
            this.stopAdapter();
        });
    }

    public initializeRequest(
        args?: DebugProtocol.InitializeRequestArguments):
        Promise<DebugProtocol.InitializeResponse> {
        if (!args) {
            args = {
                adapterID: this.debugType,
                columnsStartAt1: true,
                linesStartAt1: true,
                pathFormat: "path",
            };
        }
        return this.send("initialize", args);
        return this.waitForResponse();
    }

    public waitForEvent(eventType: string): Promise<DebugProtocol.Event> {
        return new Promise((resolve, reject) => {
            this.on(eventType, (event) => {
                resolve(event);
            });
        });
    }

    public waitForResponse(): Promise<DebugProtocol.Response> {
        return new Promise((resolve, reject) => {
            this.on("responded", (response) => {
                resolve(response);
            });
        });
    }

    private stopAdapter() {
        if (this.adapterProcess) {
            this.adapterProcess.kill();
            this.adapterProcess = null;
        }
    }

    private disconnectRequest(args?: DebugProtocol.DisconnectArguments): Promise<DebugProtocol.DisconnectResponse> {
        return this.send("disconnect", args);
    }

    private newHandleData(data: Buffer): void {
        this.newRawData = Buffer.concat([this.newRawData, data]);

        while (true) {
            if (this.newContentLength >= 0) {
                if (this.newRawData.length >= this.newContentLength) {
                    const message = this.newRawData.toString("utf8", 0, this.newContentLength);
                    this.newRawData = this.newRawData.slice(this.newContentLength);
                    this.newContentLength = -1;
                    if (message.length > 0 && this.validateJSON(message)) {
                        this.newDispatch(message);
                    }
                    continue;	// there may be more complete messages to process
                }
            } else {
                const idx = this.newRawData.indexOf(EspIdfDebugClient.CRLF);
                if (idx !== -1) {
                    const header = this.newRawData.toString("utf8", 0, idx);
                    const lines = header.split("\r\n");
                    for (const line of lines) {
                        const pair = line.split(/: +/);
                        if (pair[0].includes("Content-Length")) {
                            this.newContentLength = parseInt(pair[1], 10);
                        }
                    }
                    this.newRawData = this.newRawData.slice(idx + EspIdfDebugClient.CRLF.length);
                    continue;
                }
            }
            break;
        }
    }

    private newDispatch(body: string) {
        const rawData = JSON.parse(body);
        if (typeof rawData.event !== "undefined") {
            const event = rawData as DebugProtocol.Event;
            this.emit(event.event, event);
        } else {
            const response = rawData as DebugProtocol.Response;
            this.emit("responded", response);
        }
    }

    private validateJSON(testString: string) {
        if (/^[\],:{}\s]*$/.test(testString.replace(/\\["\\\/bfnrtu]/g, "@").
            replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, "]").
            replace(/(?:^|:|,)(?:\s*\[)+/g, ""))) {
            return true;
        } else {
            return false;
        }
    }
}
