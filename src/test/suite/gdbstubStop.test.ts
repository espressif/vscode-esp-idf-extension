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
import {
  isProjectSource,
  projectDirectoryFromProgram,
} from "../../debugAdapter/adapter/gdbstubStop";

const project = "D:/esp-idf projects/blink";
const main = `${project}/main/main.c`;
const cpu =
  "D:/espressif/.espressif/v6.1/esp-idf/components/esp_hw_support/cpu.c";

suite("gdbstub stop", () => {
  test("recognizes project sources independently of Windows separators", () => {
    assert.strictEqual(
      projectDirectoryFromProgram(`${project}/build/blink.elf`),
      project
    );
    assert.strictEqual(isProjectSource(main, project), true);
    assert.strictEqual(
      isProjectSource(main.replace(/\//g, "\\"), project.replace(/\//g, "\\")),
      true
    );
    assert.strictEqual(isProjectSource(cpu, project), false);
    assert.strictEqual(
      isProjectSource(`${project}/build/main/main.c`, project),
      false
    );
  });
});
