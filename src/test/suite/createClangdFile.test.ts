/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 19th October 2026
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
import {
  chmod,
  ensureDir,
  mkdtemp,
  readFile,
  remove,
  writeFile,
} from "fs-extra";
import { EOL, tmpdir } from "os";
import { join, resolve } from "path";
import { ExtensionContext, Uri } from "vscode";
import { createClangdFile } from "../../clang";
import { Logger } from "../../common/logger";
import { ESP } from "../../config";
import { ProjectConfigStore } from "../../project-conf/store";
import { createMockMemento } from "../mockUtils";

suite("createClangdFile", () => {
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
    if (previousStore) {
      ESP.ProjectConfiguration.store = previousStore;
    }
  });

  test("writes BuiltinHeaders: QueryDriver for a new project", async () => {
    const root = await mkdtemp(join(tmpdir(), "clangd-file-"));
    const projectDir = join(root, "project");
    const clangBin = join(root, "esp-clang", "bin");
    const clangdName = process.platform === "win32" ? "clangd.exe" : "clangd";
    try {
      await ensureDir(projectDir);
      await ensureDir(clangBin);
      const clangdPath = join(clangBin, clangdName);
      await writeFile(clangdPath, "");
      await chmod(clangdPath, 0o755);
      ESP.ProjectConfiguration.store.set(
        ESP.ProjectConfiguration.CURRENT_IDF_CONFIGURATION,
        { PATH: clangBin }
      );

      await createClangdFile(Uri.file(projectDir));

      const content = await readFile(join(projectDir, ".clangd"), "utf8");
      const expected = [
        "CompileFlags:",
        "  Remove: [-m*, -f*]",
        "  BuiltinHeaders: QueryDriver",
        "",
      ].join(EOL);
      assert.strictEqual(content, expected);
    } finally {
      ESP.ProjectConfiguration.store.clear(
        ESP.ProjectConfiguration.CURRENT_IDF_CONFIGURATION
      );
      await remove(root);
    }
  });
});
