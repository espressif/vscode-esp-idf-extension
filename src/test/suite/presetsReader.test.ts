/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 5th August 2026
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
import { tmpdir } from "os";
import { join, resolve } from "path";
import { mkdtemp, remove, writeJson } from "fs-extra";
import { ExtensionContext, Uri } from "vscode";
import { ESP } from "../../config";
import { Logger } from "../../logger/logger";
import { getProjectConfigurationElements } from "../../project-conf/presetsReader";
import { getESPIDFSettingValue } from "../../project-conf/presetSettings";
import { createMockMemento } from "../mockUtils";

function createMockContext(): ExtensionContext {
  return {
    extensionPath: resolve(__dirname, "..", "..", ".."),
    asAbsolutePath: (filename: string) =>
      resolve(__dirname, "..", "..", "..", filename),
    workspaceState: createMockMemento(),
    globalState: createMockMemento(),
  } as ExtensionContext;
}

const cmakePresets = {
  version: 3,
  cmakeMinimumRequired: { major: 3, minor: 23, patch: 0 },
  configurePresets: [
    {
      name: "common",
      hidden: true,
      generator: "Ninja",
      cacheVariables: { IDF_TARGET: "esp32c6" },
      environment: { QA_SHARED_VALUE: "from-common" },
      vendor: {
        [ESP.CMakePresets.ESP_IDF_VENDOR_KEY]: {
          schemaVersion: 1,
          settings: [{ type: "monitorBaudRate", value: "115200" }],
        },
      },
    },
    {
      name: "esp32c6",
      displayName: "Shared ESP32-C6",
      inherits: "common",
      binaryDir: "build/shared-c6",
    },
  ],
};

const cmakeUserPresets = {
  version: 3,
  configurePresets: [
    {
      name: "esp32c6-local",
      displayName: "Local ESP32-C6",
      inherits: "esp32c6",
      binaryDir: "build/local-c6",
    },
  ],
};

suite("Hidden configure presets", () => {
  let workspaceFolder: string;

  suiteSetup(() => {
    Logger.init(createMockContext());
  });

  setup(async () => {
    workspaceFolder = await mkdtemp(join(tmpdir(), "esp-idf-presets-"));
    await writeJson(
      join(
        workspaceFolder,
        ESP.ProjectConfiguration.PROJECT_CONFIGURATION_FILENAME
      ),
      cmakePresets
    );
    await writeJson(
      join(
        workspaceFolder,
        ESP.ProjectConfiguration.USER_CONFIGURATION_FILENAME
      ),
      cmakeUserPresets
    );
  });

  teardown(async () => {
    await remove(workspaceFolder);
  });

  test("hidden presets are not selectable, matching cmake --list-presets", async () => {
    const presets = await getProjectConfigurationElements(
      Uri.file(workspaceFolder)
    );

    assert.deepStrictEqual(Object.keys(presets).sort(), [
      "esp32c6",
      "esp32c6-local",
    ]);
  });

  test("hidden presets still act as inheritance bases", async () => {
    const presets = await getProjectConfigurationElements(
      Uri.file(workspaceFolder)
    );

    assert.strictEqual(presets["esp32c6"].cacheVariables.IDF_TARGET, "esp32c6");
    assert.strictEqual(
      presets["esp32c6"].environment["QA_SHARED_VALUE"],
      "from-common"
    );
    assert.strictEqual(
      getESPIDFSettingValue(presets["esp32c6"], "monitorBaudRate"),
      "115200"
    );
  });

  test("hidden is not propagated to inheriting presets", async () => {
    const presets = await getProjectConfigurationElements(
      Uri.file(workspaceFolder)
    );

    assert.strictEqual(presets["esp32c6"].hidden, undefined);
    assert.strictEqual(presets["esp32c6-local"].hidden, undefined);
  });
});
