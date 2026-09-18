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
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import * as vscode from "vscode";
import { Logger } from "../../common/logger";
import {
  expandEnvVariablesForIdfSetup,
  refreshCurrentIdfConfiguration,
  storeIdfSetupEnvironment,
} from "../../common/prepareEnv";
import { ESP } from "../../config";
import { getCurrentIdfConfiguration } from "../../configuration/env";
import {
  resetIdfConfigurationSource,
  setIdfConfigurationSource,
} from "../../configuration/idfConfigurationSource";
import { ProjectConfigStore } from "../../project-conf/store";
import { createMockMemento } from "../mockUtils";

function createFakeIdfSource(getValues: Record<string, unknown> = {}) {
  return {
    getScoped(_section: string, _scope: unknown, key: string) {
      return Object.prototype.hasOwnProperty.call(getValues, key)
        ? getValues[key]
        : undefined;
    },
    inspectGlobal() {
      return undefined;
    },
    updateScoped: async () => undefined,
    updateGlobal: async () => undefined,
    refreshConfiguration: () => undefined,
  };
}

suite("common/prepareEnv.ts", () => {
  let tempDir: string;
  let workspaceFolder: vscode.WorkspaceFolder;
  let openOcdScriptsDir: string;
  let openOcdBinDir: string;
  let customOpenOcdBinary: string;
  let customOpenOcdScriptsDir: string;

  const extensionPath = resolve(__dirname, "..", "..", "..");
  const mockUpContext: vscode.ExtensionContext = {
    extensionPath,
    asAbsolutePath: (relativePath: string) => join(extensionPath, relativePath),
    workspaceState: createMockMemento(),
    globalState: createMockMemento(),
  } as vscode.ExtensionContext;

  suiteSetup(() => {
    Logger.init(mockUpContext);
    tempDir = mkdtempSync(join(tmpdir(), "prepare-env-"));
    workspaceFolder = {
      uri: vscode.Uri.file(join(tempDir, "workspace")),
      name: "workspace",
      index: 0,
    } as vscode.WorkspaceFolder;
    mkdirSync(workspaceFolder.uri.fsPath, { recursive: true });

    const openOcdRoot = join(tempDir, "tools", "openocd-esp32");
    openOcdBinDir = join(openOcdRoot, "bin");
    openOcdScriptsDir = join(openOcdRoot, "share", "openocd", "scripts");
    mkdirSync(openOcdBinDir, { recursive: true });
    mkdirSync(openOcdScriptsDir, { recursive: true });
    const openOcdBinary = join(
      openOcdBinDir,
      process.platform === "win32" ? "openocd.exe" : "openocd"
    );
    writeFileSync(openOcdBinary, "");
    chmodSync(openOcdBinary, 0o755);

    const customOpenOcdRoot = join(tempDir, "custom", "openocd-esp32");
    customOpenOcdScriptsDir = join(
      customOpenOcdRoot,
      "share",
      "openocd",
      "scripts"
    );
    mkdirSync(join(customOpenOcdRoot, "bin"), { recursive: true });
    mkdirSync(customOpenOcdScriptsDir, { recursive: true });
    customOpenOcdBinary = join(
      customOpenOcdRoot,
      "bin",
      process.platform === "win32" ? "openocd.exe" : "openocd"
    );
    writeFileSync(customOpenOcdBinary, "");
    chmodSync(customOpenOcdBinary, 0o755);
  });

  suiteTeardown(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  setup(() => {
    ESP.ProjectConfiguration.store = ProjectConfigStore.resetForTests({
      ...mockUpContext,
      workspaceState: createMockMemento(),
    } as vscode.ExtensionContext);
  });

  teardown(() => {
    resetIdfConfigurationSource();
  });

  test("custom extra vars override the setup environment", async () => {
    setIdfConfigurationSource(
      createFakeIdfSource({
        "idf.customExtraVars": { ADF_PATH: openOcdBinDir, EXTRA: "1" },
      })
    );

    const env = await expandEnvVariablesForIdfSetup(
      { IDF_PATH: "/idf", ADF_PATH: openOcdScriptsDir },
      workspaceFolder
    );

    assert.strictEqual(env.IDF_PATH, "/idf");
    assert.strictEqual(env.ADF_PATH, openOcdBinDir);
    assert.strictEqual(env.EXTRA, "1");
  });

  test("custom vars pointing at missing paths are skipped when the setup provides them", async () => {
    const missingDir = join(tempDir, "esp-rom-elfs", "20230320");
    setIdfConfigurationSource(
      createFakeIdfSource({
        "idf.customExtraVars": {
          ESP_ROM_ELF_DIR: missingDir,
          ADF_PATH: missingDir,
          TOOL_DIR: openOcdScriptsDir,
        },
      })
    );

    const env = await expandEnvVariablesForIdfSetup(
      {
        IDF_PATH: "/idf",
        ESP_ROM_ELF_DIR: openOcdScriptsDir,
        TOOL_DIR: openOcdBinDir,
      },
      workspaceFolder
    );

    assert.strictEqual(env.ESP_ROM_ELF_DIR, openOcdScriptsDir);
    assert.strictEqual(env.ADF_PATH, missingDir);
    assert.strictEqual(env.TOOL_DIR, openOcdScriptsDir);
  });

  test("OPENOCD_SCRIPTS follows the openocd binary in PATH over a custom value", async () => {
    setIdfConfigurationSource(
      createFakeIdfSource({
        "idf.customExtraVars": { OPENOCD_SCRIPTS: "/stale/openocd/scripts" },
      })
    );

    const env = await expandEnvVariablesForIdfSetup(
      { IDF_PATH: "/idf", PATH: openOcdBinDir },
      workspaceFolder
    );

    assert.strictEqual(env.OPENOCD_SCRIPTS, openOcdScriptsDir);
  });

  test("OPENOCD_SCRIPTS from custom extra vars is ignored even without an openocd binary", async () => {
    setIdfConfigurationSource(
      createFakeIdfSource({
        "idf.customExtraVars": { OPENOCD_SCRIPTS: openOcdBinDir },
      })
    );

    const env = await expandEnvVariablesForIdfSetup(
      {
        IDF_PATH: "/idf",
        PATH: join(tempDir, "no-openocd-here"),
        OPENOCD_SCRIPTS: openOcdScriptsDir,
      },
      workspaceFolder
    );

    assert.strictEqual(env.OPENOCD_SCRIPTS, openOcdScriptsDir);
  });

  test("OPENOCD_SCRIPTS follows idf.customOpenOCDPath over the openocd binary in PATH", async () => {
    setIdfConfigurationSource(
      createFakeIdfSource({
        "idf.customOpenOCDPath": customOpenOcdBinary,
        "idf.customExtraVars": {},
      })
    );

    const env = await expandEnvVariablesForIdfSetup(
      {
        IDF_PATH: "/idf",
        PATH: openOcdBinDir,
        OPENOCD_SCRIPTS: openOcdScriptsDir,
      },
      workspaceFolder
    );

    assert.strictEqual(env.OPENOCD_SCRIPTS, customOpenOcdScriptsDir);
  });

  test("refreshCurrentIdfConfiguration re-expands the stored setup environment", async () => {
    setIdfConfigurationSource(
      createFakeIdfSource({
        "idf.customExtraVars": { FOO: "custom", BAR: "1" },
      })
    );
    await storeIdfSetupEnvironment(
      { IDF_PATH: "/idf", FOO: "setup" },
      workspaceFolder
    );
    assert.strictEqual(getCurrentIdfConfiguration().FOO, "custom");
    assert.strictEqual(getCurrentIdfConfiguration().BAR, "1");

    setIdfConfigurationSource(
      createFakeIdfSource({ "idf.customExtraVars": {} })
    );
    const refreshed = await refreshCurrentIdfConfiguration(workspaceFolder);

    assert.strictEqual(refreshed, true);
    const env = getCurrentIdfConfiguration();
    assert.strictEqual(env.IDF_PATH, "/idf");
    assert.strictEqual(env.FOO, "setup");
    assert.strictEqual("BAR" in env, false);
  });

  test("refreshCurrentIdfConfiguration leaves the store alone without a setup environment", async () => {
    setIdfConfigurationSource(
      createFakeIdfSource({ "idf.customExtraVars": { FOO: "custom" } })
    );
    ESP.ProjectConfiguration.store.set(
      ESP.ProjectConfiguration.CURRENT_IDF_CONFIGURATION,
      { IDF_PATH: "/idf" }
    );

    const refreshed = await refreshCurrentIdfConfiguration(workspaceFolder);

    assert.strictEqual(refreshed, false);
    assert.deepStrictEqual(getCurrentIdfConfiguration(), { IDF_PATH: "/idf" });
  });
});
