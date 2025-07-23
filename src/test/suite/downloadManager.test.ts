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
import * as del from "del";
import * as nock from "nock";
import * as path from "path";
import { ExtensionContext } from "vscode";
import { DownloadManager } from "../../downloadManager";
import { IdfToolsManager } from "../../idfToolsManager";
import { InstallManager } from "../../installManager";
import { IPackage } from "../../IPackage";
import { Logger } from "../../logger/logger";
import { OutputChannel } from "../../logger/outputChannel";
import { PlatformInformation } from "../../PlatformInformation";
import * as utils from "../../utils";

suite("Download Manager Tests", () => {
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
                  "url": "https://dl.espressif.com/dl/test.zip"
                },
                "macos": {
                  "sha256": "9504cd1783ef3c242d06330a50d54dc8f838b605f5fc3e892c47254929f7350c",
                  "size": 91457,
                  "url": "https://dl.espressif.com/dl/test.zip"
                },
                "name": "1.9.0",
                "status": "recommended",
                "win64": {
                  "sha256": "2d70010633ddaacc3af4ffbd21e22fae90d158674a09e132e06424ba3ab036e9",
                  "size": 254497,
                  "url": "https://dl.espressif.com/dl/test.zip"
                }
              }
            ]
          }]}`);
  const absPath = (filename) => path.join(__dirname, filename);
  const mockUpContext: ExtensionContext = {
    extensionPath: __dirname,
    asAbsolutePath: absPath,
  } as ExtensionContext;
  utils.setExtensionContext(mockUpContext);
  Logger.init(mockUpContext);
  const output = OutputChannel.init();
  const platInfo: PlatformInformation = {
    architecture: "x86_64",
    platform: "darwin",
    platformToUse: "macos",
  } as PlatformInformation;
  const mockInstallPath = path.join(__dirname, "../../..", "testFiles");
  const idfToolsManager = new IdfToolsManager(
    packageJsonMockUp,
    platInfo,
    output,
    process.env.IDF_PATH
  );
  const downloadManager = new DownloadManager(mockInstallPath);
  const installManager = new InstallManager(mockInstallPath);

  test("Download correct", async () => {
    // Setup
    nock("https://dl.espressif.com/dl/").get("/test.zip").reply(
      200,
      {},
      {
        "content-disposition": "attachment; filename=ninja-win.zip",
        "content-length": "12345",
        "content-type": "application/octet-stream",
      }
    );
    await idfToolsManager.getPackageList(["ninja"]).then(async (pkgs) => {
      const pkgUrl = idfToolsManager.obtainUrlInfoForPlatform(pkgs[0]);
      const destPath = path.resolve(mockInstallPath, "dist");
      await downloadManager
        .downloadWithResume(pkgUrl.url, destPath)
        .then((reply) => {
          assert.equal(reply.headers["content-length"], "12345");
        });
      const testFile = path.join(mockInstallPath, "dist", "test.zip");
      await del(testFile, { force: true });
    });
    assert.equal(true, true);
  });

  test("Download fail", async () => {
    // Setup
    nock("https://dl.espressif.com/dl/").get("/test.zip").reply(401);
    await idfToolsManager.getPackageList(["ninja"]).then(async (pkgs) => {
      const pkgUrl = idfToolsManager.obtainUrlInfoForPlatform(pkgs[0]);
      const destPath = path.resolve(mockInstallPath, "dist");
      await downloadManager
        .downloadWithResume(pkgUrl.url, destPath)
        .then((reply) => {
          assert.fail("Expected an error, didn't receive it");
        })
        .catch((reason) => {
          assert.equal(reason, "Error: HTTP/HTTPS Response Error");
        });
      const testFile = path.join(mockInstallPath, "dist", "test.zip");
      await del(testFile, { force: true });
    });
  });

  test("Validate file checksum", async () => {
    const testFile = path.join(mockInstallPath, "dist", "mytest.zip");
    const expectedHash =
      "1e6c77c830842fe48c79d62f8aec25f29075551ecf50d4be948f5c197677ce5b";
    const testFileSize = 239;
    await utils
      .validateFileSizeAndChecksum(testFile, expectedHash, testFileSize)
      .then((isValidFile) => {
        assert.equal(isValidFile, true);
      });
  });

  test("Install zip", async () => {
    const pkg = {
      name: "tool",
      version_cmd: ["ninja", "--version"],
      versions: [
        {
          macos: {
            url: "https://dl.espressif.com/dl/mytest.zip",
            sha256:
              "1e6c77c830842fe48c79d62f8aec25f29075551ecf50d4be948f5c197677ce5b",
            size: 239,
          },
          name: "1.9.0",
          status: "recommended",
        },
      ],
    } as IPackage;
    const versionName = idfToolsManager.getVersionToUse(pkg);
    const absolutePath: string = installManager.getToolPackagesPath([
      "tools",
      pkg.name,
      versionName,
    ]);
    await installManager
      .installZipPackage(idfToolsManager, pkg, absolutePath)
      .then(() => {
        const fileIsExtracted = utils.fileExists(
          downloadManager.getToolPackagesPath([
            "tools",
            pkg.name,
            pkg.versions[0].name,
            "sample.txt",
          ])
        );
        assert.equal(fileIsExtracted, true);
      });
  });

  test("Install targz", async () => {
    const pkg = {
      name: "tool",
      version_cmd: ["ninja", "--version"],
      versions: [
        {
          macos: {
            url: "https://dl.espressif.com/dl/tartest.tar.gz",
            sha256:
              "e506ea55c741db7727b8f4e6187d7f6dcc331f58b2e08dbd13b7fc862f7e1afb",
            size: 306,
          },
          name: "1.9.0",
          status: "recommended",
        },
      ],
    } as IPackage;
    await installManager
      .installTarPackage(idfToolsManager, pkg, "gz")
      .then(() => {
        const isFileExtracted = utils.fileExists(
          downloadManager.getToolPackagesPath([
            "tools",
            pkg.name,
            pkg.versions[0].name,
            "tarsample.txt",
          ])
        );
        assert.equal(isFileExtracted, true);
      });
  });
});
