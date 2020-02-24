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

import * as assert from "assert";
import * as path from "path";
import * as vscode from "vscode";
import * as idfConf from "../idfConfiguration";
import { EspIdfDebugClient } from "./espIdfDebugClient";

suite("Debug Adapter Tests", () => {
    const DEBUG_ADAPTER = path.join(__dirname, "..", "..", "esp_debug_adapter", "debug_adapter_main.py");
    const portToUse = 43474; // To use in server mode

    let debugClient: EspIdfDebugClient;

    setup( () => {
        debugClient = new EspIdfDebugClient("python", ["-u", DEBUG_ADAPTER, "-cc"], "espidf", {}, true);
        // Use portToUse here to attach to existing server. May be easier to debug initially
        debugClient.startClient(portToUse);
    });

    suite("initialize", () => {
        test("should return supported features", async () => {
            const initArgs = {
                adapterID: "espidf",
                clientID: "vscode",
                columnsStartAt1: true,
                linesStartAt1: true,
            };
            await debugClient.initializeRequest(initArgs).then((response) => {
                response.body = response.body || {};
                assert.equal(response.body.supportsConfigurationDoneRequest, true);
            });
        });
    });

});
