import { EventEmitter } from "events";

import { TCLConnection } from "../openOcd/tcl/tclClient";
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
        //
    }

    public async stop() {
        //
    }
}
