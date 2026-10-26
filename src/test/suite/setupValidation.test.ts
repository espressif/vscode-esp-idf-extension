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
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { l10n } from "vscode";
import {
  idfInstallRejectReason,
  isFinishedIdfInstall,
  resolveEimIdfJsonCandidates,
} from "../../eim/getExistingSetups";
import {
  missingActivationScriptDetail,
  statusBarFailureTooltip,
} from "../../eim/setupFailureDetail";
import { EspIdfJson, InstallationStatus } from "../../eim/types";
import { hasRequiredIdfEnv } from "../../eim/verifySetup";

function finishedCatalog(): EspIdfJson {
  return {
    gitPath: "/usr/bin/git",
    idfSelectedId: "esp-idf",
    idfInstalled: [],
    version: "3.1.0",
  };
}

suite("setup validation", () => {
  let tempDir: string | undefined;

  teardown(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  suite("hasRequiredIdfEnv", () => {
    const required = {
      IDF_PATH: "/esp/esp-idf",
      IDF_PYTHON_ENV_PATH: "/esp/.espressif/python_env",
      PATH: "/usr/bin",
    };

    test("accepts IDF_PATH, IDF_PYTHON_ENV_PATH, and PATH", () => {
      assert.strictEqual(hasRequiredIdfEnv(required), true);
    });

    test("accepts Path on Windows-style env maps", () => {
      assert.strictEqual(
        hasRequiredIdfEnv({
          IDF_PATH: required.IDF_PATH,
          IDF_PYTHON_ENV_PATH: required.IDF_PYTHON_ENV_PATH,
          Path: "/usr/bin",
        }),
        true
      );
    });

    test("rejects a missing PATH, IDF_PATH, or IDF_PYTHON_ENV_PATH", () => {
      assert.strictEqual(hasRequiredIdfEnv(undefined), false);
      assert.strictEqual(
        hasRequiredIdfEnv({
          IDF_PATH: required.IDF_PATH,
          IDF_PYTHON_ENV_PATH: required.IDF_PYTHON_ENV_PATH,
        }),
        false
      );
      assert.strictEqual(
        hasRequiredIdfEnv({
          IDF_PYTHON_ENV_PATH: required.IDF_PYTHON_ENV_PATH,
          PATH: required.PATH,
        }),
        false
      );
      assert.strictEqual(
        hasRequiredIdfEnv({
          IDF_PATH: required.IDF_PATH,
          PATH: required.PATH,
        }),
        false
      );
      assert.strictEqual(
        hasRequiredIdfEnv({
          ...required,
          IDF_PATH: "",
        }),
        false
      );
    });
  });

  suite("isFinishedIdfInstall", () => {
    test("a missing activation script is not a finished install", async () => {
      tempDir = mkdtempSync(join(tmpdir(), "esp-idf-finished-"));
      const finished = await isFinishedIdfInstall(finishedCatalog(), {
        id: "esp-idf",
        name: "esp-idf",
        path: join(tempDir, "esp-idf"),
        idfToolsPath: join(tempDir, "tools"),
        status: InstallationStatus.Finished,
        activationScript: join(tempDir, "missing-activate.sh"),
      });
      assert.strictEqual(finished, false);
    });

    test("an activation script that exists is a finished install", async () => {
      tempDir = mkdtempSync(join(tmpdir(), "esp-idf-finished-"));
      const activationScript = join(tempDir, "activate.sh");
      writeFileSync(activationScript, "#!/bin/sh\n");
      const finished = await isFinishedIdfInstall(finishedCatalog(), {
        id: "esp-idf",
        name: "esp-idf",
        path: join(tempDir, "esp-idf"),
        idfToolsPath: join(tempDir, "tools"),
        status: InstallationStatus.Finished,
        activationScript,
      });
      assert.strictEqual(finished, true);
    });

    test("an empty activation script stays finished", async () => {
      const finished = await isFinishedIdfInstall(finishedCatalog(), {
        id: "esp-idf",
        name: "esp-idf",
        path: "/esp/esp-idf",
        idfToolsPath: "/esp/tools",
        status: InstallationStatus.Finished,
        activationScript: "",
      });
      assert.strictEqual(finished, true);
    });

    test("a missing activation script names the script", async () => {
      tempDir = mkdtempSync(join(tmpdir(), "esp-idf-finished-"));
      const script = join(tempDir, "missing-activate.sh");
      const detail = await idfInstallRejectReason(finishedCatalog(), {
        id: "esp-idf",
        name: "esp-idf",
        path: join(tempDir, "esp-idf"),
        idfToolsPath: join(tempDir, "tools"),
        status: InstallationStatus.Finished,
        activationScript: script,
      });
      assert.strictEqual(
        detail,
        missingActivationScriptDetail(join(tempDir, "esp-idf"), script)
      );
      assert.ok(detail.includes(join(tempDir, "esp-idf")));
      assert.ok(detail.includes(script));
    });
  });

  suite("invalid setup tooltip", () => {
    test("keeps the action line under the reason", () => {
      const idfPath = "/esp/esp-idf";
      const detail = missingActivationScriptDetail(
        idfPath,
        "/tools/activate.sh"
      );
      const action = l10n.t("Select current ESP-IDF version");
      assert.strictEqual(
        statusBarFailureTooltip(action, detail),
        `${detail}\n${action}`
      );
      assert.ok(detail.includes(idfPath));
      assert.ok(detail.includes("/tools/activate.sh"));
      assert.strictEqual(statusBarFailureTooltip(action), action);
    });
  });

  suite("resolveEimIdfJsonCandidates", () => {
    test("a directory containing eim_idf.json resolves to that file", async () => {
      tempDir = mkdtempSync(join(tmpdir(), "esp-idf-eim-json-"));
      const toolsDir = join(tempDir, "tools");
      mkdirSync(toolsDir);
      const nested = join(toolsDir, "eim_idf.json");
      writeFileSync(nested, "{}");
      const fallback = join(tempDir, "default-eim_idf.json");
      writeFileSync(fallback, "{}");

      const resolved = await resolveEimIdfJsonCandidates(toolsDir, fallback);

      assert.strictEqual(resolved, nested);
    });

    test("a file path is used as itself", async () => {
      tempDir = mkdtempSync(join(tmpdir(), "esp-idf-eim-json-"));
      const customFile = join(tempDir, "eim_idf.json");
      writeFileSync(customFile, "{}");
      const fallback = join(tempDir, "default-eim_idf.json");
      writeFileSync(fallback, "{}");

      const resolved = await resolveEimIdfJsonCandidates(customFile, fallback);

      assert.strictEqual(resolved, customFile);
    });

    test("a missing custom path falls back to the given default file", async () => {
      tempDir = mkdtempSync(join(tmpdir(), "esp-idf-eim-json-"));
      const fallback = join(tempDir, "default-eim_idf.json");
      writeFileSync(fallback, "{}");

      const resolved = await resolveEimIdfJsonCandidates(
        join(tempDir, "missing-tools"),
        fallback
      );

      assert.strictEqual(resolved, fallback);
    });
  });
});
