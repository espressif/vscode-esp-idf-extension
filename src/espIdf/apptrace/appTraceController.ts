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
import * as Telnet from "telnet-client";
import { OpenOCDController } from "./openOCDController";

export class AppTraceSession extends EventEmitter{
    private openOCDController: OpenOCDController;
    private telnetController: Telnet;

    constructor(openOCDController: OpenOCDController) {
        super();
        this.openOCDController = openOCDController;
        this.telnetController = new Telnet();
    }

    public async start() {
        await this.launchOpenOCDServer();
        await this.connectTelnetSession("localhost", 4444);
    }

    // public async stop() {

    // }
    private async launchOpenOCDServer() {
        this.openOCDController.on("data", (data: Buffer) => {
            this.emit("openOCD-data", data);
        });
        this.openOCDController.on("error", (data: Buffer, error: Error) => {
            let errorMsg: string = "OpenOCD server failed to start";
            if (error.message === "STDERR_CHAN_RECV") {
                const regex = /^Error:.*$/gmi;
                const errStr = data.toString();
                const matchArr = errStr.match(regex);
                errorMsg += ` ${matchArr.join(" ")}`;
            }
            this.emit("openOCD-error", errorMsg, error);
        });
        await this.openOCDController.startServer();
    }
    private async connectTelnetSession(host: string, port: number) {
        await this.telnetController.connect({
            host,
            port,
            timeout: 1500,
        });
    }
    private async sendCommandToTelnetSession(command: string) {
        return await this.telnetController.exec(command);
    }
}
