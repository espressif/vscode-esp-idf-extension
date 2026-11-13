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
import { l10n, MarkdownString } from "vscode";
import {
  idfInstallRejectReason,
  isFinishedIdfInstall,
  resolveEimIdfJsonCandidates,
} from "../../eim/getExistingSetups";
import {
  installPathMissingDetail,
  missingActivationScriptDetail,
  statusBarFailureTooltip,
  wrapTooltipText,
} from "../../eim/setupFailureDetail";
import { EspIdfJson, InstallationStatus } from "../../eim/types";
import { hasRequiredIdfEnv, missingToolNames } from "../../eim/verifySetup";

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

  suite("missingToolNames", () => {
    const tools = [
      { name: "cmake", doesToolExist: false },
      { name: "ninja", doesToolExist: false },
      { name: "xtensa-esp-elf", doesToolExist: false },
    ];

    test("a system PATH hit exempts that tool", () => {
      const missing = missingToolNames(tools, ["cmake"]);
      assert.ok(!missing.includes("cmake"));
      assert.ok(missing.includes("ninja"));
    });

    test("a tool missing from the system PATH stays missing", () => {
      const missing = missingToolNames(tools, []);
      assert.ok(missing.includes("cmake"));
      assert.ok(missing.includes("ninja"));
    });

    test("another required tool is still reported", () => {
      assert.deepStrictEqual(missingToolNames(tools, ["cmake", "ninja"]), [
        "xtensa-esp-elf",
      ]);
    });
  });

  suite("isFinishedIdfInstall", () => {
    test("a missing activation script is not a finished install", async () => {
      tempDir = mkdtempSync(join(tmpdir(), "esp-idf-finished-"));
      const idfPath = join(tempDir, "esp-idf");
      mkdirSync(idfPath);
      const finished = await isFinishedIdfInstall(finishedCatalog(), {
        id: "esp-idf",
        name: "esp-idf",
        path: idfPath,
        idfToolsPath: join(tempDir, "tools"),
        status: InstallationStatus.Finished,
        activationScript: join(tempDir, "missing-activate.sh"),
      });
      assert.strictEqual(finished, false);
    });

    test("an activation script that exists is a finished install", async () => {
      tempDir = mkdtempSync(join(tmpdir(), "esp-idf-finished-"));
      const idfPath = join(tempDir, "esp-idf");
      mkdirSync(idfPath);
      const activationScript = join(tempDir, "activate.sh");
      writeFileSync(activationScript, "#!/bin/sh\n");
      const finished = await isFinishedIdfInstall(finishedCatalog(), {
        id: "esp-idf",
        name: "esp-idf",
        path: idfPath,
        idfToolsPath: join(tempDir, "tools"),
        status: InstallationStatus.Finished,
        activationScript,
      });
      assert.strictEqual(finished, true);
    });

    test("an empty activation script stays finished", async () => {
      tempDir = mkdtempSync(join(tmpdir(), "esp-idf-finished-"));
      const idfPath = join(tempDir, "esp-idf");
      mkdirSync(idfPath);
      const finished = await isFinishedIdfInstall(finishedCatalog(), {
        id: "esp-idf",
        name: "esp-idf",
        path: idfPath,
        idfToolsPath: join(tempDir, "tools"),
        status: InstallationStatus.Finished,
        activationScript: "",
      });
      assert.strictEqual(finished, true);
    });

    test("a missing activation script names the script", async () => {
      tempDir = mkdtempSync(join(tmpdir(), "esp-idf-finished-"));
      const idfPath = join(tempDir, "esp-idf");
      mkdirSync(idfPath);
      const script = join(tempDir, "missing-activate.sh");
      const detail = await idfInstallRejectReason(finishedCatalog(), {
        id: "esp-idf",
        name: "esp-idf",
        path: idfPath,
        idfToolsPath: join(tempDir, "tools"),
        status: InstallationStatus.Finished,
        activationScript: script,
      });
      assert.strictEqual(
        detail,
        missingActivationScriptDetail(idfPath, script)
      );
      assert.ok(detail.includes(idfPath));
      assert.ok(detail.includes(script));
    });

    test("a missing install directory names the path", async () => {
      tempDir = mkdtempSync(join(tmpdir(), "esp-idf-finished-"));
      const idfPath = join(tempDir, "esp-idf");
      const activationScript = join(tempDir, "activate.sh");
      writeFileSync(activationScript, "#!/bin/sh\n");
      const install = {
        id: "esp-idf",
        name: "esp-idf",
        path: idfPath,
        idfToolsPath: join(tempDir, "tools"),
        status: InstallationStatus.Finished,
        activationScript,
      };
      const finished = await isFinishedIdfInstall(finishedCatalog(), install);
      const detail = await idfInstallRejectReason(finishedCatalog(), install);
      assert.strictEqual(finished, false);
      assert.strictEqual(detail, installPathMissingDetail(idfPath));
      assert.ok(detail.includes(idfPath));
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
      const tooltip = statusBarFailureTooltip(action, detail);
      const reasonAt = tooltip.value.indexOf("Activation script for");
      const actionAt = tooltip.value.indexOf("Select current ESP");
      assert.ok(tooltip instanceof MarkdownString);
      assert.ok(reasonAt >= 0);
      assert.ok(actionAt > reasonAt);
      assert.ok(tooltip.value.includes("activate"));
      assert.ok(detail.includes(idfPath));
      assert.ok(detail.includes("/tools/activate.sh"));
      const actionOnly = statusBarFailureTooltip(action);
      assert.ok(actionOnly instanceof MarkdownString);
      assert.ok(actionOnly.value.includes("Select current ESP"));
      assert.ok(actionOnly.value.includes("version"));
    });

    test("wraps a long activation script path before esp-idf", () => {
      const reported =
        "Activation script for /Users/brainignacio/.espressif/v6.1/esp-idf does not exist: /Users/brainignacio/.espressif/tools/activate_idf_v6.1_not.sh";
      const wrapped = wrapTooltipText(reported);
      assert.ok(wrapped.includes("\nesp-idf"));
      assert.ok(!wrapped.includes("esp-\n"));
      for (const line of wrapped.split("\n")) {
        if (line.length <= 60) {
          continue;
        }
        assert.ok(!/[\/\\ ]/.test(line.slice(0, -1)));
      }
    });

    test("wraps a Windows path after a backslash", () => {
      const reported =
        "The ESP-IDF install path does not exist: C:\\Users\\brainignacio\\.espressif\\v6.1\\esp-idf";
      const wrapped = wrapTooltipText(reported);
      assert.ok(wrapped.split("\n").some((line) => line.endsWith("\\")));
      assert.ok(wrapped.includes("esp-idf"));
      assert.ok(!wrapped.includes("esp-\n"));
      for (const line of wrapped.split("\n")) {
        if (line.length <= 60) {
          continue;
        }
        assert.ok(!/[\/\\ ]/.test(line.slice(0, -1)));
      }
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
