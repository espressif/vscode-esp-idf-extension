/*
 * Project: ESP-IDF VSCode Extension
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
import { ExtensionContext, workspace, WorkspaceFolder } from "vscode";
import {
  configuredFromEnvVarsDecision,
  customExtraVarsIdfPath,
  shouldClearFolderCustomExtraVars,
} from "../../activation/customExtraVars";
import { ESP } from "../../config";
import { persistSelectedIdfSetup } from "../../eim/selectedIdfSetup";
import { ProjectConfigStore } from "../../project-conf/store";
import { createMockMemento } from "../mockUtils";

suite("configuredFromEnvVars", () => {
  const idfPath = "/esp/esp-idf";
  const loaded = { setup: { idfPath } };

  suite("customExtraVarsIdfPath", () => {
    test("requires a non-empty IDF_PATH string", () => {
      assert.strictEqual(customExtraVarsIdfPath(undefined), undefined);
      assert.strictEqual(customExtraVarsIdfPath(null), undefined);
      assert.strictEqual(customExtraVarsIdfPath([]), undefined);
      assert.strictEqual(customExtraVarsIdfPath({}), undefined);
      assert.strictEqual(customExtraVarsIdfPath({ IDF_PATH: "" }), undefined);
      assert.strictEqual(customExtraVarsIdfPath({ IDF_PATH: 1 }), undefined);
      assert.strictEqual(
        customExtraVarsIdfPath({ IDF_PATH: idfPath }),
        idfPath
      );
    });
  });

  suite("shouldClearFolderCustomExtraVars", () => {
    const selectedPath = "/esp/selected";

    test("a different folder IDF_PATH is cleared", () => {
      assert.strictEqual(
        shouldClearFolderCustomExtraVars(
          { workspaceFolderValue: { IDF_PATH: "/esp/env" } },
          selectedPath
        ),
        true
      );
    });

    test("the same folder IDF_PATH is kept", () => {
      assert.strictEqual(
        shouldClearFolderCustomExtraVars(
          { workspaceFolderValue: { IDF_PATH: selectedPath } },
          selectedPath
        ),
        false
      );
    });

    test("a folder value without IDF_PATH is kept", () => {
      assert.strictEqual(
        shouldClearFolderCustomExtraVars(
          { workspaceFolderValue: { IDF_TARGET: "esp32" } },
          selectedPath
        ),
        false
      );
    });

    test("a user or workspace value is not cleared", () => {
      assert.strictEqual(
        shouldClearFolderCustomExtraVars(
          {
            workspaceValue: { IDF_PATH: "/esp/workspace" },
            globalValue: { IDF_PATH: "/esp/user" },
          },
          selectedPath
        ),
        false
      );
    });
  });

  suite("configuredFromEnvVarsDecision", () => {
    test("a missing custom setup does not select this path", () => {
      assert.strictEqual(
        configuredFromEnvVarsDecision({}, loaded, true),
        undefined
      );
      assert.strictEqual(
        configuredFromEnvVarsDecision({ IDF_PATH: "" }, loaded, true),
        undefined
      );
    });

    test("an invalid custom setup does not select this path", () => {
      const customVars = { IDF_PATH: idfPath };
      assert.strictEqual(
        configuredFromEnvVarsDecision(customVars, undefined, true),
        undefined
      );
      assert.strictEqual(
        configuredFromEnvVarsDecision(
          customVars,
          { detail: "IDF_PATH does not exist" },
          true
        ),
        undefined
      );
      assert.strictEqual(
        configuredFromEnvVarsDecision(customVars, loaded, false),
        undefined
      );
    });

    test("a valid custom setup selects configuredFromEnvVars", () => {
      assert.deepStrictEqual(
        configuredFromEnvVarsDecision({ IDF_PATH: idfPath }, loaded, true),
        { kind: "configuredFromEnvVars" }
      );
    });
  });

  suite("persistSelectedIdfSetup", () => {
    let previousStore: ProjectConfigStore;
    let folder: WorkspaceFolder;

    setup(() => {
      previousStore = ESP.ProjectConfiguration.store;
      folder = workspaceFolder();
      ESP.ProjectConfiguration.store = ProjectConfigStore.resetForTests({
        workspaceState: createMockMemento(),
        globalState: createMockMemento(),
      } as ExtensionContext);
    });

    teardown(() => {
      ESP.ProjectConfiguration.store = previousStore;
    });

    test("an env-sourced save does not write the selected setup", async () => {
      const wrote = await persistSelectedIdfSetup(
        folder,
        { idfPath, id: "esp-idf" },
        false
      );

      assert.strictEqual(wrote, false);
      assert.strictEqual(
        ESP.ProjectConfiguration.store.getSelectedIdfSetup(folder),
        undefined
      );
    });

    test("a catalog save writes the selected setup", async () => {
      const wrote = await persistSelectedIdfSetup(folder, {
        idfPath,
        id: "esp-idf",
      });

      assert.strictEqual(wrote, true);
      assert.deepStrictEqual(
        ESP.ProjectConfiguration.store.getSelectedIdfSetup(folder),
        { idfPath, id: "esp-idf" }
      );
    });
  });
});

function workspaceFolder(): WorkspaceFolder {
  const folder = workspace.workspaceFolders?.[0];
  assert.ok(folder);
  return folder;
}
