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
import { mkdirSync, mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import * as vscode from "vscode";
import { ESP } from "../../config";
import {
  getCurrentIdfConfiguration,
  getVenvPythonBinPath,
  getVirtualEnvPythonPath,
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

  suite("venv python binary", () => {
    const isWindows = process.platform === "win32";

    function createVenv(binaries: string[]) {
      const venvDir = mkdtempSync(join(tmpdir(), "idf-venv-"));
      const binDir = join(venvDir, isWindows ? "Scripts" : "bin");
      mkdirSync(binDir);
      for (const binary of binaries) {
        writeFileSync(join(binDir, binary), "");
      }
      return venvDir;
    }

    test("getVenvPythonBinPath prefers python over python3", function () {
      if (isWindows) {
        this.skip();
      }
      const venvDir = createVenv(["python", "python3"]);
      assert.strictEqual(
        getVenvPythonBinPath(venvDir),
        join(venvDir, "bin", "python")
      );
    });

    test("getVenvPythonBinPath falls back to python3", function () {
      if (isWindows) {
        this.skip();
      }
      const venvDir = createVenv(["python3"]);
      assert.strictEqual(
        getVenvPythonBinPath(venvDir),
        join(venvDir, "bin", "python3")
      );
    });

    test("getVenvPythonBinPath uses python.exe on Windows", function () {
      if (!isWindows) {
        this.skip();
      }
      const venvDir = createVenv(["python.exe"]);
      assert.strictEqual(
        getVenvPythonBinPath(venvDir),
        join(venvDir, "Scripts", "python.exe")
      );
    });

    function setIdfConfiguration(env: { [key: string]: string }) {
      ESP.ProjectConfiguration.store.set(
        ESP.ProjectConfiguration.CURRENT_IDF_CONFIGURATION,
        env
      );
    }

    test("getVirtualEnvPythonPath returns the stored PYTHON value", () => {
      setIdfConfiguration({
        PYTHON: "/venv/bin/python",
        IDF_PYTHON_ENV_PATH: "/venv",
      });
      assert.strictEqual(getVirtualEnvPythonPath(), "/venv/bin/python");
    });

    test("getVirtualEnvPythonPath derives from IDF_PYTHON_ENV_PATH", () => {
      const venvDir = createVenv(isWindows ? ["python.exe"] : ["python"]);
      setIdfConfiguration({ IDF_PYTHON_ENV_PATH: venvDir });
      assert.strictEqual(
        getVirtualEnvPythonPath(),
        getVenvPythonBinPath(venvDir)
      );
    });

    test("getVirtualEnvPythonPath is undefined without a venv", () => {
      assert.strictEqual(getVirtualEnvPythonPath(), undefined);
    });
  });
});
