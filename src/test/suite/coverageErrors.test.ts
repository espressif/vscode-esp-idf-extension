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
  confserverProcessFailed,
  coverageGcovDataFailed,
  isKnownError,
} from "../../common/error/knownError";
import {
  resolveKnownErrorDescriptor,
  resolveKnownErrorUserMessage,
} from "../../common/error/resolve";
import { ErrorCode } from "../../common/error/types";
import { coverageCommandErrorMapping } from "../../coverage/errorMapping";

suite("Coverage command errors", () => {
  suite("resolveKnownErrorUserMessage", () => {
    test("command mapping applies Coverage output channel for CoverageGcovDataFailed", () => {
      const descriptor = resolveKnownErrorDescriptor(
        coverageGcovDataFailed("gcov exited with code 1"),
        coverageCommandErrorMapping
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "Coverage");
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          coverageGcovDataFailed("gcov exited with code 1"),
          coverageCommandErrorMapping
        ),
        "Error building gcov data from gcda files. Check the ESP-IDF output for more details."
      );
      assert.strictEqual(descriptor?.actions[0].label, "Coverage Tutorial");
    });

    test("command mapping applies coverage-specific wording for ConfserverProcessFailed", () => {
      assert.ok(
        resolveKnownErrorUserMessage(
          confserverProcessFailed("startup", { detail: "process exited" }),
          coverageCommandErrorMapping
        )?.includes("enabling coverage")
      );
    });

    test("coverageGcovDataFailed maps to registry code", () => {
      const error = coverageGcovDataFailed("detail");
      assert.ok(isKnownError(error));
      assert.strictEqual(error.code, ErrorCode.CoverageGcovDataFailed);
    });
  });
});
