import { EventEmitter } from "events";

import { sleep } from "../../utils";
import { TCLClient, TCLConnection } from "../openOcd/tcl/tclClient";
import { AppTraceArchiveTreeDataProvider } from "./tree/appTraceArchiveTreeDataProvider";
import { AppTraceTreeDataProvider } from "./tree/appTraceTreeDataProvider";

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

export class HeapTraceManager extends EventEmitter {
    private treeDataProvider: AppTraceTreeDataProvider;
    private archiveDataProvider: AppTraceArchiveTreeDataProvider;
    private tclConnectionParams: TCLConnection;

    constructor(treeDataProvider: AppTraceTreeDataProvider, archiveDataProvider: AppTraceArchiveTreeDataProvider) {
        super();
        this.treeDataProvider = treeDataProvider;
        this.archiveDataProvider = archiveDataProvider;
        this.tclConnectionParams = { host: "localhost", port: 6666 };
    }

    public async start() {
        const commandChain = new CommandChain();
        commandChain
            .buildCommand("reset halt")
            .buildCommand("bp 0x400d35b4 4 hw")
            .buildCommand("bp 0x400d35d0 4 hw")
            .buildCommand("resume")
            .buildCommand("rbp 0x400d35b4")
            .buildCommand("esp32 sysview start file:///tmp/heap_log.svdat")
            .buildCommand("resume")
            .buildCommand("rbp 0x400d35d0")
            .buildCommand("esp32 sysview stop");

        const notificationReceiver = new TCLClient(this.tclConnectionParams);
        notificationReceiver.on("response", (resp: Buffer) => {
            // tslint:disable-next-line: no-console
            console.log("->> " + resp);
        });
        notificationReceiver.sendCommandWithCapture("tcl_notifications on");

        const commandProcessor = new TCLClient(this.tclConnectionParams);
        commandProcessor.on("response", async (resp: Buffer) => {
            // tslint:disable-next-line: no-console
            console.log(">>" + resp);
            const cmd = commandChain.next();
            if (!cmd) {
                notificationReceiver.stop();
                commandProcessor.stop();
                return;
            }
            await sleep(5000);
            commandProcessor.sendCommandWithCapture(cmd);
        });
        await sleep(1000);
        commandProcessor.sendCommandWithCapture(commandChain.next());
    }

    public async stop() {
        //
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
