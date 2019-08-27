import { EventEmitter } from "events";

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
        // 1: reset halt
        // 2: fetch breakpoint address
        // 3. set addr_of_heap_trace_start breakpoint `bp 0x400d3598 4 hw`
        // 4. set addr_of_heap_trace_stop breakpoint `bp 0x400d3598 4 hw`
        // 5. resume
        // 6. if program stops at heap_trace_start
        //   a. esp32 sysview start ${tempFilePath}.svdat
        // 7. resume
        // 8. if program stops ar heap_trace_stop
        //   a. esp32 sysview stop

        const tCLClient = new TCLClient(this.tclConnectionParams);
        tCLClient.on("response", (resp: Buffer) => {
            // tslint:disable-next-line: no-console
            console.log("->> " + resp);
        });
        tCLClient.sendCommandWithCapture("tcl_notifications on");

        // tslint:disable-next-line: variable-name
        const tCLClient_1 = new TCLClient(this.tclConnectionParams);
        tCLClient_1.on("response", (resp: Buffer) => {
            // tslint:disable-next-line: no-console
            console.log("<< " + resp);
        });
        setTimeout(() => {
            tCLClient_1.sendCommandWithCapture("bp 0x400d35b4 4 hw");
            setTimeout(() => {
                tCLClient_1.sendCommandWithCapture("bp 0x400d35d0 4 hw");
                setTimeout(() => {
                    tCLClient_1.sendCommandWithCapture("resume");
                    setTimeout(() => {
                        tCLClient_1.sendCommandWithCapture("esp32 sysview start file:///tmp/heap_log.svdat");
                        setTimeout(() => {
                            tCLClient_1.sendCommandWithCapture("resume");
                            setTimeout(() => {
                                tCLClient_1.sendCommandWithCapture("esp32 sysview stop");
                            }, 2000);
                        }, 2000);
                    }, 2000);
                }, 2000);
            }, 2000);
        }, 2000);
    }

    public async stop() {
        //
    }
}
