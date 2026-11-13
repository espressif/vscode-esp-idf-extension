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
import { mkdirSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import {
  eimIdfJsonWatchTarget,
  shouldScheduleReactionAfterWatcherSync,
} from "../../activation/eimIdfJsonWatcher";

suite("shouldScheduleReactionAfterWatcherSync", () => {
  test("schedules a reaction after retarget when runReaction is false", () => {
    assert.strictEqual(
      shouldScheduleReactionAfterWatcherSync(false, true),
      true
    );
  });

  test("does not schedule when runReaction is true", () => {
    assert.strictEqual(
      shouldScheduleReactionAfterWatcherSync(true, true),
      false
    );
  });

  test("does not schedule when the watch target is unchanged", () => {
    assert.strictEqual(
      shouldScheduleReactionAfterWatcherSync(false, false),
      false
    );
  });
});

suite("eimIdfJsonWatchTarget", () => {
  let tempDir: string | undefined;

  teardown(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  test("an existing parent directory watches the filename", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "esp-idf-eim-watch-"));
    const toolsDir = join(tempDir, "tools");
    mkdirSync(toolsDir);
    const filePath = join(toolsDir, "eim_idf.json");

    const target = await eimIdfJsonWatchTarget(filePath);

    assert.strictEqual(target.base, resolve(toolsDir));
    assert.strictEqual(target.pattern, "eim_idf.json");
  });

  test("a missing parent watches the next missing child", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "esp-idf-eim-watch-"));
    const filePath = join(tempDir, "missing", "tools", "eim_idf.json");

    const target = await eimIdfJsonWatchTarget(filePath);

    assert.strictEqual(target.base, resolve(tempDir));
    assert.strictEqual(target.pattern, "missing");
  });

  test("an existing intermediate directory watches the next missing child", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "esp-idf-eim-watch-"));
    const missingDir = join(tempDir, "missing");
    mkdirSync(missingDir);
    const filePath = join(missingDir, "tools", "eim_idf.json");

    const target = await eimIdfJsonWatchTarget(filePath);

    assert.strictEqual(target.base, resolve(missingDir));
    assert.strictEqual(target.pattern, "tools");
  });
});
