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
import { resolve } from "path";
import {
  ConfigurationTarget,
  ExtensionContext,
  Uri,
  WorkspaceFolder,
} from "vscode";
import { ESP } from "../../config";
import {
  IdfConfigurationSource,
  resetIdfConfigurationSource,
  setIdfConfigurationSource,
} from "../../configuration/idfConfigurationSource";
import {
  legacyCurrentSetupSetting,
  resolveFinishedInstall,
  shouldKeepUnlistedCurrentSetup,
  selectedIdfPath,
} from "../../eim/selectedIdfSetup";
import { ProjectConfigStore } from "../../project-conf/store";
import { createMockMemento } from "../mockUtils";

type RecordedWrite = {
  key: string;
  value: unknown;
  target: ConfigurationTarget;
};

function folder(name: string, index = 0): WorkspaceFolder {
  return {
    name,
    index,
    uri: Uri.file(resolve("/tmp/esp-selected-setup", name)),
  };
}

suite("selected ESP-IDF setup", () => {
  let previousStore: ProjectConfigStore;

  setup(() => {
    previousStore = ESP.ProjectConfiguration.store;
    ESP.ProjectConfiguration.store = ProjectConfigStore.resetForTests({
      workspaceState: createMockMemento(),
      globalState: createMockMemento(),
    } as ExtensionContext);
  });

  teardown(() => {
    ESP.ProjectConfiguration.store = previousStore;
    resetIdfConfigurationSource();
  });

  test("keeps an empty activation script on the stored setup", async () => {
    const root = folder("root");

    await ESP.ProjectConfiguration.store.setSelectedIdfSetup(root, {
      idfPath: "/esp/env",
      id: "env",
      activationScript: "",
    });

    assert.deepStrictEqual(
      ESP.ProjectConfiguration.store.getSelectedIdfSetup(root),
      {
        idfPath: "/esp/env",
        id: "env",
        activationScript: "",
      }
    );
  });

  test("keeps a separate selection for each workspace folder", async () => {
    const root = folder("root", 0);
    const firmware = folder("firmware", 1);
    const store = ESP.ProjectConfiguration.store;

    await store.setSelectedIdfSetup(root, {
      idfPath: "/esp/v5.4",
      id: "v5.4",
    });
    await store.setSelectedIdfSetup(firmware, {
      idfPath: "/esp/v5.5",
      id: "v5.5",
    });

    assert.deepStrictEqual(store.getSelectedIdfSetup(root), {
      idfPath: "/esp/v5.4",
      id: "v5.4",
    });
    assert.deepStrictEqual(store.getSelectedIdfSetup(firmware), {
      idfPath: "/esp/v5.5",
      id: "v5.5",
    });
  });

  test("seeds an empty selection from idf.currentSetup and clears that setting", async () => {
    const writes: RecordedWrite[] = [];
    const root = folder("root");
    setIdfConfigurationSource(
      legacySource("/esp/legacy", writes, {
        workspaceFolderValue: "/esp/legacy",
        workspaceValue: "/esp/legacy",
        globalValue: "/esp/legacy",
      })
    );

    const path = await selectedIdfPath(root);

    assert.strictEqual(path, "/esp/legacy");
    assert.deepStrictEqual(
      ESP.ProjectConfiguration.store.getSelectedIdfSetup(root),
      { idfPath: "/esp/legacy" }
    );
    assert.deepStrictEqual(writes, [
      {
        key: legacyCurrentSetupSetting,
        value: undefined,
        target: ConfigurationTarget.WorkspaceFolder,
      },
      {
        key: legacyCurrentSetupSetting,
        value: undefined,
        target: ConfigurationTarget.Workspace,
      },
      {
        key: legacyCurrentSetupSetting,
        value: undefined,
        target: ConfigurationTarget.Global,
      },
    ]);
  });

  test("an existing selection is left in place", async () => {
    const writes: RecordedWrite[] = [];
    const root = folder("root");
    await ESP.ProjectConfiguration.store.setSelectedIdfSetup(root, {
      idfPath: "/esp/kept",
      id: "kept",
    });
    setIdfConfigurationSource(
      legacySource("/esp/legacy", writes, {
        workspaceFolderValue: "/esp/legacy",
      })
    );

    const path = await selectedIdfPath(root);

    assert.strictEqual(path, "/esp/kept");
    assert.deepStrictEqual(writes, []);
  });

  suite("resolveFinishedInstall", () => {
    const finished = [
      { path: "/esp/first", id: "first" },
      { path: "/esp/second", id: "second" },
    ];

    test("an empty selection waits for the project check", () => {
      assert.strictEqual(
        resolveFinishedInstall("", finished, false),
        undefined
      );
    });

    test("an empty selection can be replaced once the folder is already configured", () => {
      assert.deepStrictEqual(resolveFinishedInstall("", finished, true), {
        install: finished[0],
        replaced: true,
      });
    });

    test("a matching install is kept", () => {
      assert.deepStrictEqual(
        resolveFinishedInstall("/esp/second", finished, false),
        { install: finished[1], replaced: false }
      );
    });

    test("a stale path is replaced with the first finished install", () => {
      assert.deepStrictEqual(
        resolveFinishedInstall("/esp/missing", finished, false),
        { install: finished[0], replaced: true }
      );
    });

    test("an existing unlisted path is kept", () => {
      assert.strictEqual(
        shouldKeepUnlistedCurrentSetup({
          idfPathExists: true,
          activationScript: "/esp/activate.sh",
          activationScriptExists: true,
        }),
        true
      );
    });

    test("an empty activation script does not block keeping an existing path", () => {
      assert.strictEqual(
        shouldKeepUnlistedCurrentSetup({
          idfPathExists: true,
          activationScript: "",
          activationScriptExists: false,
        }),
        true
      );
    });

    test("a missing path is not kept", () => {
      assert.strictEqual(
        shouldKeepUnlistedCurrentSetup({
          idfPathExists: false,
          activationScript: "/esp/activate.sh",
          activationScriptExists: true,
        }),
        false
      );
    });

    test("a missing stored activation script is not kept", () => {
      assert.strictEqual(
        shouldKeepUnlistedCurrentSetup({
          idfPathExists: true,
          activationScript: "/esp/missing-activate.sh",
          activationScriptExists: false,
        }),
        false
      );
    });

    test("no finished install leaves the selection unresolved", () => {
      assert.strictEqual(
        resolveFinishedInstall("/esp/missing", [], false),
        undefined
      );
    });
  });
});

function legacySource(
  value: string,
  writes: RecordedWrite[],
  inspected: {
    workspaceFolderValue?: string;
    workspaceValue?: string;
    globalValue?: string;
  }
): IdfConfigurationSource {
  return {
    getScoped(_section, _scope, key) {
      return key === legacyCurrentSetupSetting ? value : undefined;
    },
    inspectGlobal(key) {
      if (key !== legacyCurrentSetupSetting) {
        return undefined;
      }
      return inspected;
    },
    updateScoped(_section, _scope, key, newValue, target) {
      writes.push({ key, value: newValue, target });
      return Promise.resolve();
    },
    updateGlobal(key, newValue, target) {
      writes.push({ key, value: newValue, target });
      return Promise.resolve();
    },
    refreshConfiguration() {
      return undefined;
    },
  };
}
