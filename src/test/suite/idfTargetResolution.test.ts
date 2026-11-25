/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 25th November 2026
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as assert from "assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import * as vscode from "vscode";
import { Logger } from "../../common/logger";
import { ESP } from "../../config";
import { getCurrentIdfConfiguration } from "../../configuration/env";
import {
  IdfConfigurationSource,
  resetIdfConfigurationSource,
  setIdfConfigurationSource,
} from "../../configuration/idfConfigurationSource";
import {
  getIdfTargetFromSdkconfig,
  getIdfTargetFromSdkconfigDefaults,
} from "../../configuration/workspace";
import { ProjectConfigStore } from "../../project-conf/store";
import { createMockMemento } from "../mockUtils";

function createFakeIdfSource(
  getValues: Record<string, unknown> = {}
): IdfConfigurationSource {
  return {
    getScoped: (_section, _scope, key) => getValues[key],
    inspectGlobal: () => undefined,
    updateScoped: async () => undefined,
    updateGlobal: async () => undefined,
    refreshConfiguration: () => undefined,
  };
}

suite("IDF target resolution", () => {
  const extensionPath = resolve(__dirname, "..", "..", "..");
  const mockUpContext: vscode.ExtensionContext = {
    extensionPath,
    asAbsolutePath: (relativePath: string) => join(extensionPath, relativePath),
    workspaceState: createMockMemento(),
    globalState: createMockMemento(),
  } as vscode.ExtensionContext;
  let tempDir: string;
  let workspaceUri: vscode.Uri;

  suiteSetup(() => {
    Logger.init(mockUpContext);
  });

  setup(() => {
    tempDir = mkdtempSync(join(tmpdir(), "idf-target-"));
    workspaceUri = vscode.Uri.file(join(tempDir, "workspace"));
    mkdirSync(workspaceUri.fsPath, { recursive: true });
    ESP.ProjectConfiguration.store = ProjectConfigStore.resetForTests({
      ...mockUpContext,
      workspaceState: createMockMemento(),
    } as vscode.ExtensionContext);
    setIdfConfigurationSource(createFakeIdfSource());
  });

  teardown(() => {
    resetIdfConfigurationSource();
    rmSync(tempDir, { recursive: true, force: true });
  });

  function writeWorkspaceFile(name: string, content: string) {
    writeFileSync(join(workspaceUri.fsPath, name), content);
  }

  test("uses sdkconfig.defaults when there is no sdkconfig and no target in settings", async () => {
    writeWorkspaceFile(
      "sdkconfig.defaults",
      'CONFIG_ESPTOOLPY_FLASHSIZE_4MB=y\nCONFIG_IDF_TARGET="esp32s3"\n'
    );

    const idfTarget = await getIdfTargetFromSdkconfig(workspaceUri);

    assert.strictEqual(idfTarget, "esp32s3");
    assert.strictEqual(getCurrentIdfConfiguration().IDF_TARGET, "esp32s3");
  });

  test("sdkconfig takes precedence over sdkconfig.defaults", async () => {
    writeWorkspaceFile("sdkconfig", 'CONFIG_IDF_TARGET="esp32c6"\n');
    writeWorkspaceFile("sdkconfig.defaults", 'CONFIG_IDF_TARGET="esp32s3"\n');

    assert.strictEqual(
      await getIdfTargetFromSdkconfig(workspaceUri),
      "esp32c6"
    );
  });

  test("idf.customExtraVars IDF_TARGET takes precedence over sdkconfig.defaults", async () => {
    writeWorkspaceFile("sdkconfig.defaults", 'CONFIG_IDF_TARGET="esp32s3"\n');
    setIdfConfigurationSource(
      createFakeIdfSource({
        "idf.customExtraVars": { IDF_TARGET: "esp32c3" },
      })
    );

    assert.strictEqual(
      await getIdfTargetFromSdkconfig(workspaceUri),
      "esp32c3"
    );
  });

  test("falls back to esp32 when no file or setting defines a target", async () => {
    writeWorkspaceFile(
      "sdkconfig.defaults",
      "CONFIG_ESPTOOLPY_FLASHSIZE_4MB=y\n"
    );

    assert.strictEqual(await getIdfTargetFromSdkconfig(workspaceUri), "esp32");
  });

  test("reads the idf.sdkconfigDefaults files in order instead of sdkconfig.defaults", async () => {
    const absoluteDefaults = join(tempDir, "sdkconfig.board");
    writeFileSync(absoluteDefaults, 'CONFIG_IDF_TARGET="esp32h2"\n');
    writeWorkspaceFile(
      "sdkconfig.common",
      "CONFIG_ESPTOOLPY_FLASHSIZE_4MB=y\n"
    );
    writeWorkspaceFile("sdkconfig.defaults", 'CONFIG_IDF_TARGET="esp32s3"\n');
    setIdfConfigurationSource(
      createFakeIdfSource({
        "idf.sdkconfigDefaults": [
          "sdkconfig.missing",
          "sdkconfig.common",
          absoluteDefaults,
        ],
      })
    );

    assert.strictEqual(
      await getIdfTargetFromSdkconfigDefaults(workspaceUri),
      "esp32h2"
    );
  });

  test("ignores sdkconfig.defaults when idf.sdkconfigDefaults files define no target", async () => {
    writeWorkspaceFile(
      "sdkconfig.common",
      "CONFIG_ESPTOOLPY_FLASHSIZE_4MB=y\n"
    );
    writeWorkspaceFile("sdkconfig.defaults", 'CONFIG_IDF_TARGET="esp32s3"\n');
    setIdfConfigurationSource(
      createFakeIdfSource({ "idf.sdkconfigDefaults": ["sdkconfig.common"] })
    );

    assert.strictEqual(
      await getIdfTargetFromSdkconfigDefaults(workspaceUri),
      ""
    );
  });

  test("only matches an uncommented CONFIG_IDF_TARGET line, with LF or CRLF", async () => {
    writeWorkspaceFile(
      "sdkconfig.defaults",
      '# CONFIG_IDF_TARGET="esp32c3"\r\nCONFIG_IDF_TARGET="esp32p4"\r\n'
    );

    assert.strictEqual(
      await getIdfTargetFromSdkconfigDefaults(workspaceUri),
      "esp32p4"
    );
  });
});
