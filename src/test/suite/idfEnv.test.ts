/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 17th September 2026
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
import { resolve } from "path";
import * as vscode from "vscode";
import { ESP } from "../../config";
import {
  getCurrentIdfConfiguration,
  updateCurrentIdfEnvVar,
} from "../../configuration/env";
import { ProjectConfigStore } from "../../project-conf/store";
import { createMockMemento } from "../mockUtils";

suite("configuration/env.ts", () => {
  const mockUpContext: vscode.ExtensionContext = {
    extensionPath: resolve(__dirname, "..", "..", ".."),
    workspaceState: createMockMemento(),
    globalState: createMockMemento(),
  } as vscode.ExtensionContext;

  suiteSetup(() => {
    ESP.ProjectConfiguration.store = ProjectConfigStore.resetForTests(
      mockUpContext
    );
  });

  setup(() => {
    ESP.ProjectConfiguration.store.set(
      ESP.ProjectConfiguration.CURRENT_IDF_CONFIGURATION,
      { IDF_PATH: "/idf", IDF_TARGET: "esp32c6" }
    );
  });

  teardown(() => {
    ESP.ProjectConfiguration.store.clear(
      ESP.ProjectConfiguration.CURRENT_IDF_CONFIGURATION
    );
  });

  test("getCurrentIdfConfiguration returns a copy that callers can mutate", () => {
    const env = getCurrentIdfConfiguration();
    delete env.IDF_TARGET;
    env.PYTHONUNBUFFERED = "0";

    assert.deepStrictEqual(getCurrentIdfConfiguration(), {
      IDF_PATH: "/idf",
      IDF_TARGET: "esp32c6",
    });
  });

  test("updateCurrentIdfEnvVar persists into the store", () => {
    updateCurrentIdfEnvVar("IDF_TARGET", "esp32s3");
    assert.strictEqual(getCurrentIdfConfiguration().IDF_TARGET, "esp32s3");
  });
});
