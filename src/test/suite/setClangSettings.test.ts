/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 18th November 2026
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
import { chmod, ensureDir, mkdtemp, remove, writeFile } from "fs-extra";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { ExtensionContext } from "vscode";
import {
  setClangdSupportsCustomConfigFileForTests,
  setClangSettings,
} from "../../clang";
import { Logger } from "../../common/logger";
import { ESP } from "../../config";
import { ProjectConfigStore } from "../../project-conf/store";
import { createMockMemento } from "../mockUtils";

suite("setClangSettings", () => {
  const mockContext: ExtensionContext = {
    extensionPath: resolve(__dirname, "..", "..", ".."),
    asAbsolutePath: (filename: string) =>
      resolve(__dirname, "..", "..", "..", filename),
    workspaceState: createMockMemento(),
    globalState: createMockMemento(),
  } as ExtensionContext;
  let previousStore: ProjectConfigStore;

  suiteSetup(() => {
    previousStore = ESP.ProjectConfiguration.store;
    ESP.ProjectConfiguration.store = ProjectConfigStore.resetForTests(
      mockContext
    );
    Logger.init(mockContext);
  });

  suiteTeardown(() => {
    setClangdSupportsCustomConfigFileForTests(undefined);
    if (previousStore) {
      ESP.ProjectConfiguration.store = previousStore;
    }
  });

  teardown(() => {
    setClangdSupportsCustomConfigFileForTests(undefined);
    ESP.ProjectConfiguration.store.clear(
      ESP.ProjectConfiguration.CURRENT_IDF_CONFIGURATION
    );
  });

  async function withEspClang(
    options: {
      setIdfPath: boolean;
      writeConfigFile: boolean;
      supportsCustomConfig?: boolean;
    },
    assertSettings: (
      settingsJson: { [key: string]: any },
      paths: { buildPath: string; configFile: string }
    ) => void
  ) {
    const root = await mkdtemp(join(tmpdir(), "clang-settings-"));
    const clangBin = join(root, "esp-clang", "bin");
    const idfPath = join(root, "esp-idf");
    const configFile = join(idfPath, "tools", "clangd-config.yaml");
    const clangdName = process.platform === "win32" ? "clangd.exe" : "clangd";
    const pathName =
      Object.keys(process.env).find((key) => key.toUpperCase() === "PATH") ||
      "PATH";
    try {
      await ensureDir(clangBin);
      const clangdPath = join(clangBin, clangdName);
      await writeFile(clangdPath, "");
      await chmod(clangdPath, 0o755);
      if (options.writeConfigFile) {
        await ensureDir(join(idfPath, "tools"));
        await writeFile(configFile, "CompileFlags:\n  Remove: [-m*]\n");
      }
      const env: { [key: string]: string } = { [pathName]: clangBin };
      if (options.setIdfPath) {
        env.IDF_PATH = idfPath;
      }
      ESP.ProjectConfiguration.store.set(
        ESP.ProjectConfiguration.CURRENT_IDF_CONFIGURATION,
        env
      );
      setClangdSupportsCustomConfigFileForTests(
        async () => options.supportsCustomConfig !== false
      );

      const settingsJson: { [key: string]: any } = {};
      const buildPath = join(root, "build");
      await setClangSettings(settingsJson, buildPath);

      assert.strictEqual(settingsJson["clangd.path"], clangdPath);
      assertSettings(settingsJson, { buildPath, configFile });
    } finally {
      await remove(root);
    }
  }

  function customConfigArgument(settingsJson: { [key: string]: any }) {
    return (settingsJson["clangd.arguments"] as string[]).find((argument) =>
      argument.startsWith("--custom-config-file=")
    );
  }

  test("adds custom-config-file when the selected ESP-IDF ships clangd-config.yaml", async () => {
    await withEspClang(
      { setIdfPath: true, writeConfigFile: true },
      (settingsJson, paths) => {
        assert.deepStrictEqual(settingsJson["clangd.arguments"], [
          "--background-index",
          "--query-driver=**",
          `--compile-commands-dir=${paths.buildPath}`,
          `--custom-config-file=${paths.configFile}`,
        ]);
      }
    );
  });

  test("omits custom-config-file when the selected ESP-IDF has no clangd-config.yaml", async () => {
    await withEspClang(
      { setIdfPath: true, writeConfigFile: false },
      (settingsJson, paths) => {
        assert.strictEqual(customConfigArgument(settingsJson), undefined);
        assert.ok(
          settingsJson["clangd.arguments"].includes(
            `--compile-commands-dir=${paths.buildPath}`
          )
        );
      }
    );
  });

  test("ignores clangd-config.yaml from the active setup when the project uses another ESP-IDF", async () => {
    const root = await mkdtemp(join(tmpdir(), "clang-settings-"));
    const clangBin = join(root, "esp-clang", "bin");
    const activeIdfPath = join(root, "master", "esp-idf");
    const projectIdfPath = join(root, "release-5.2", "esp-idf");
    const clangdName = process.platform === "win32" ? "clangd.exe" : "clangd";
    const pathName =
      Object.keys(process.env).find((key) => key.toUpperCase() === "PATH") ||
      "PATH";
    try {
      await ensureDir(clangBin);
      const clangdPath = join(clangBin, clangdName);
      await writeFile(clangdPath, "");
      await chmod(clangdPath, 0o755);
      await ensureDir(join(activeIdfPath, "tools"));
      await writeFile(
        join(activeIdfPath, "tools", "clangd-config.yaml"),
        "CompileFlags:\n  Remove: [-m*]\n"
      );
      await ensureDir(projectIdfPath);
      ESP.ProjectConfiguration.store.set(
        ESP.ProjectConfiguration.CURRENT_IDF_CONFIGURATION,
        { [pathName]: clangBin, IDF_PATH: activeIdfPath }
      );
      setClangdSupportsCustomConfigFileForTests(async () => true);

      const settingsJson: { [key: string]: any } = {
        "idf.currentSetup": projectIdfPath,
      };
      await setClangSettings(settingsJson, join(root, "build"));

      assert.strictEqual(settingsJson["clangd.path"], clangdPath);
      assert.ok(
        !(settingsJson["clangd.arguments"] as string[]).some((argument) =>
          argument.startsWith("--custom-config-file=")
        ),
        JSON.stringify(settingsJson["clangd.arguments"])
      );
    } finally {
      await remove(root);
    }
  });

  test("omits custom-config-file when clangd does not accept the option", async () => {
    await withEspClang(
      { setIdfPath: true, writeConfigFile: true, supportsCustomConfig: false },
      (settingsJson, paths) => {
        assert.strictEqual(customConfigArgument(settingsJson), undefined);
        assert.ok(
          settingsJson["clangd.arguments"].includes(
            `--compile-commands-dir=${paths.buildPath}`
          )
        );
      }
    );
  });

  test("omits custom-config-file when no ESP-IDF path is selected", async () => {
    await withEspClang(
      { setIdfPath: false, writeConfigFile: true },
      (settingsJson) => {
        assert.strictEqual(customConfigArgument(settingsJson), undefined);
      }
    );
  });
});
