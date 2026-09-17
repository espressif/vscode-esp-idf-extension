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
import { mkdirSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { findStaleCustomExtraVars } from "../../configuration/staleCustomExtraVars";

suite("configuration/staleCustomExtraVars.ts", () => {
  let tempDir: string;
  let existingDir: string;
  let missingDir: string;

  suiteSetup(() => {
    tempDir = mkdtempSync(join(tmpdir(), "stale-extra-vars-"));
    existingDir = join(tempDir, "openocd-20260703", "scripts");
    missingDir = join(tempDir, "openocd-20240318", "scripts");
    mkdirSync(existingDir, { recursive: true });
  });

  suiteTeardown(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("flags a custom path that does not exist when the setup provides the var", async () => {
    const stale = await findStaleCustomExtraVars(
      { OPENOCD_SCRIPTS: missingDir },
      { OPENOCD_SCRIPTS: existingDir }
    );

    assert.deepStrictEqual(stale, [
      { name: "OPENOCD_SCRIPTS", value: missingDir, setupValue: existingDir },
    ]);
  });

  test("keeps a custom path that exists", async () => {
    const stale = await findStaleCustomExtraVars(
      { OPENOCD_SCRIPTS: existingDir },
      { OPENOCD_SCRIPTS: join(tempDir, "other") }
    );

    assert.deepStrictEqual(stale, []);
  });

  test("keeps vars the setup does not provide", async () => {
    const stale = await findStaleCustomExtraVars(
      { ADF_PATH: missingDir },
      { OPENOCD_SCRIPTS: existingDir }
    );

    assert.deepStrictEqual(stale, []);
  });

  test("keeps values that are not absolute paths", async () => {
    const stale = await findStaleCustomExtraVars(
      { IDF_TARGET: "esp32c6", IDF_CCACHE_ENABLE: "1" },
      { IDF_TARGET: "esp32", IDF_CCACHE_ENABLE: "0" }
    );

    assert.deepStrictEqual(stale, []);
  });

  test("ignores PATH and non-string values", async () => {
    const stale = await findStaleCustomExtraVars(
      { PATH: missingDir, OPENOCD_SCRIPTS: 42 },
      { PATH: existingDir, OPENOCD_SCRIPTS: existingDir }
    );

    assert.deepStrictEqual(stale, []);
  });

  test("returns nothing without a setup environment", async () => {
    const stale = await findStaleCustomExtraVars(
      { OPENOCD_SCRIPTS: missingDir },
      undefined
    );

    assert.deepStrictEqual(stale, []);
  });
});
