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
import * as os from "os";
import * as vscode from "vscode";
import { PlatformInformation } from "../../PlatformInformation";
import * as utils from "../../utils";

suite("PlatformInformation Tests", () => {
  test("Get platform info", () => {
    const mockUpContext = {
      extensionPath: __dirname,
    } as vscode.ExtensionContext;
    utils.setExtensionContext(mockUpContext); // Need a path to execute a child process to get info
    return PlatformInformation.GetPlatformInformation().then((actual) => {
      assert.equal(actual.platform, os.platform());
      assert.equal(actual.architecture, "x86_64");
    });
  });
});
