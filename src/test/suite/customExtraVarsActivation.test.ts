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
import { workspace, WorkspaceFolder } from "vscode";
import {
  configuredFromEnvVarsDecision,
  customExtraVarsIdfPath,
} from "../../activation/customExtraVars";
import {
  IdfConfigurationSource,
  resetIdfConfigurationSource,
  setIdfConfigurationSource,
} from "../../configuration/idfConfigurationSource";
import { writeCurrentSetupSetting } from "../../eim/verifySetup";

suite("configuredFromEnvVars", () => {
  const idfPath = "/esp/esp-idf";
  const loaded = { setup: { idfPath } };

  teardown(() => {
    resetIdfConfigurationSource();
  });

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

  suite("writeCurrentSetupSetting", () => {
    test("an env-sourced save does not write idf.currentSetup", async () => {
      const writes: string[] = [];
      setIdfConfigurationSource(recordingSource(writes));
      const folder = workspaceFolder();

      const wrote = await writeCurrentSetupSetting(idfPath, folder, false);

      assert.strictEqual(wrote, false);
      assert.deepStrictEqual(writes, []);
    });

    test("a catalog save still writes idf.currentSetup", async () => {
      const writes: string[] = [];
      setIdfConfigurationSource(recordingSource(writes));
      const folder = workspaceFolder();

      const wrote = await writeCurrentSetupSetting(idfPath, folder, true);

      assert.strictEqual(wrote, true);
      assert.deepStrictEqual(writes, ["idf.currentSetup"]);
    });
  });
});

function workspaceFolder(): WorkspaceFolder {
  const folder = workspace.workspaceFolders?.[0];
  assert.ok(folder);
  return folder;
}

function recordingSource(writes: string[]): IdfConfigurationSource {
  return {
    getScoped() {
      return undefined;
    },
    inspectGlobal() {
      return undefined;
    },
    updateScoped(_section, _scope, key) {
      writes.push(key);
      return Promise.resolve();
    },
    updateGlobal(key) {
      writes.push(key);
      return Promise.resolve();
    },
    refreshConfiguration() {
      return undefined;
    },
  };
}
