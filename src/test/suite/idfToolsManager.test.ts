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
import { ExtensionContext } from "vscode";
import { IdfToolsManager } from "../../idfToolsManager";
import { OutputChannel } from "../../logger/outputChannel";
import { PlatformInformation } from "../../PlatformInformation";
import * as utils from "../../utils";
import { ProjectConfigStore } from "../../project-conf";
import { ESP } from "../../config";
import { createMockMemento } from "../mockUtils";

suite("IDF Tools Manager Tests", async () => {
  // Common setup variables
  const packageJsonMockUp = JSON.parse(`{
        "tools": [{
            "description": "Ninja build system",
            "export_paths": [
              [
                ""
              ]
            ],
            "export_vars": {},
            "install": "on_request",
            "name": "ninja",
            "platform_overrides": [
              {
                "install": "always",
                "platforms": [
                  "win32",
                  "win64"
                ]
              }
            ],
            "version_cmd": [
              "ninja",
              "--version"
            ],
            "version_regex": "([0-9.]+)",
            "versions": [
              {
                "linux-amd64": {
                  "sha256": "978fd9e26c2db8d33392c6daef50e9edac0a3db6680710a9f9ad47e01f3e49b7",
                  "size": 85276,
                  "url": "https://dl.espressif.com/dl/mytest.zip"
                },
                "macos": {
                  "sha256": "9504cd1783ef3c242d06330a50d54dc8f838b605f5fc3e892c47254929f7350c",
                  "size": 91457,
                  "url": "https://dl.espressif.com/dl/mytest.zip"
                },
                "name": "1.9.0",
                "status": "recommended",
                "win64": {
                  "sha256": "2d70010633ddaacc3af4ffbd21e22fae90d158674a09e132e06424ba3ab036e9",
                  "size": 254497,
                  "url": "https://dl.espressif.com/dl/mytest.zip"
                }
              }
            ]
          }]}`);
  const mockUpContext: ExtensionContext = {
    extensionPath: __dirname,
    workspaceState: createMockMemento(),
    globalState: createMockMemento(),
  } as ExtensionContext;
  utils.setExtensionContext(mockUpContext);
  ESP.ProjectConfiguration.store = ProjectConfigStore.init(mockUpContext);
  const platInfo: PlatformInformation = {
    architecture: "x86_64",
    platform: "darwin",
    platformToUse: "macos",
    fallbackPlatform: "macos",
  };
  const output = OutputChannel.init();
  const idfToolsManager = new IdfToolsManager(
    packageJsonMockUp,
    platInfo,
    output,
    process.env.IDF_PATH
  );
  const mockInstallPath = path.join(__dirname, "../../..", "testFiles");

  test("Get Packages List", async () => {
    await idfToolsManager.getPackageList(["ninja"]).then((packages) => {
      assert.equal(packages[0].description, "Ninja build system");
    });
  });

  test("Obtain Url for current OS", async () => {
    await idfToolsManager.getPackageList(["ninja"]).then((packages) => {
      const pkgUrl = idfToolsManager.obtainUrlInfoForPlatform(packages[0]);
      assert.equal(pkgUrl.url, "https://dl.espressif.com/dl/mytest.zip");
      assert.equal(
        pkgUrl.sha256,
        "9504cd1783ef3c242d06330a50d54dc8f838b605f5fc3e892c47254929f7350c"
      );
      assert.equal(pkgUrl.size, "91457");
    });
  });

  // Following two tests use ninja binary in {DIR}/testFiles
  // In the project is included the Linux version (which is used by CI)
  // In order to run tests locally, please replace Linux ninja for your OS ninja binary.
  test("Verify installed version", async () => {
    await idfToolsManager.getPackageList(["ninja"]).then(async (packages) => {
      const result = await idfToolsManager.checkBinariesVersion(
        packages[0],
        mockInstallPath
      );
      assert.equal(result, "1.9.0");
    });
  });

  test("Verify all packages exists", async () => {
    const results = await idfToolsManager.verifyPackages(mockInstallPath, [
      "ninja",
    ]);
    // tslint:disable-next-line: no-string-literal
    assert.equal(results["ninja"], "1.9.0");
  });
});
