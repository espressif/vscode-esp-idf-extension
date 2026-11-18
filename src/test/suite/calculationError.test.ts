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
import { formatCalculationError } from "../../views/tracing/calculationError";

suite("Calculation error text", () => {
  test("keeps an Error message that postMessage would otherwise drop", () => {
    const error = new Error("logtrace_proc.py failed");

    assert.strictEqual(
      formatCalculationError(error, "app"),
      "logtrace_proc.py failed"
    );
    assert.strictEqual(
      formatCalculationError({ message: "logtrace_proc.py failed" }, "app"),
      "logtrace_proc.py failed"
    );
  });

  test("uses the trace kind when the cloned error has no message", () => {
    assert.strictEqual(
      formatCalculationError({}, "app"),
      "App trace calculation failed"
    );
    assert.strictEqual(
      formatCalculationError({}, "heap"),
      "Heap trace calculation failed"
    );
    assert.strictEqual(
      formatCalculationError("  ", "app"),
      "App trace calculation failed"
    );
  });
});
