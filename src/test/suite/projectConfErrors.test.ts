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
import { isKnownError, missingDependency } from "../../common/error/knownError";
import { resolveKnownErrorUserMessage } from "../../common/error/resolve";
import { ErrorCode } from "../../common/error/types";

const projectConfErrorOptions = { outputChannel: "Project Configuration" };

suite("Project configuration command errors", () => {
  test("missingDependency for uninitialized manager maps to user message", () => {
    const error = missingDependency("Project Configuration Manager", {
      userMessage: "Project Configuration Manager is not initialized.",
      logMessage: "Project Configuration Manager not initialized.",
      actions: [],
      outputChannel: "Project Configuration",
    });
    assert.ok(isKnownError(error));
    assert.strictEqual(error.code, ErrorCode.MISSING_DEPENDENCY);

    const message = resolveKnownErrorUserMessage(
      error,
      projectConfErrorOptions
    );
    assert.ok(
      message?.includes("Project Configuration Manager is not initialized")
    );
  });
});
