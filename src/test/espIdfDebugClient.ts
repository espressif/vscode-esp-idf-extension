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
    private runtime: string;
    private execArgs: string[];
    private adapterProcess: cp.ChildProcess;
    private spawnOptions: cp.SpawnOptions;
    private enableStderr: boolean;
    private debugType: string;
    private socket: net.Socket;
    private defaultPort: number = 43474;

    constructor(
        runtime: string,
        execArgs: string[], debugType: string,
        spawnOptions: cp.SpawnOptions,
        enableStderr: boolean,
        defaultPort?: number) {
            super();
            this.runtime = runtime;
            this.execArgs = execArgs;
            this.spawnOptions = spawnOptions;
            this.enableStderr = enableStderr;
            this.debugType = debugType;
            if (defaultPort) {
                this.defaultPort = defaultPort;
            }
    }
    /**
     * Starts a new debug adapter and sets up communication via stdin/stdout.
     * When port number is specified, this class will not execute the debug adapter
     * and it will connect to specified port directly.
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
                    if (data.toString().trim().endsWith("DEBUG_ADAPTER_READY2CONNECT")) {
                        this.socket = net.createConnection(this.defaultPort, "127.0.0.1", () => {
                            this.connect(this.socket, this.socket);
                            resolve();
                        });
                    }
                });

                this.adapterProcess.on("error", (err) => {
                    reject(err);
                });
                this.adapterProcess.on("exit", (code: number, signal: string) => {
                    if (code) {
                        // tslint:disable-next-line: no-console
                        console.log(sanitize(`debug adapter exit code: ${code}`));
                    }
                });
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
            this.adapterProcess.kill("SIGKILL");
            this.adapterProcess = null;
        }
    }

    private disconnectRequest(args?: DebugProtocol.DisconnectArguments): Promise<DebugProtocol.DisconnectResponse> {
        return this.send("disconnect", args);
    }
}
