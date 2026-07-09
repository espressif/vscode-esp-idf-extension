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
  importProjectFailed,
  isKnownError,
  newProjectWizardFailed,
  projectScaffoldFailed,
} from "../../common/error/knownError";
import {
  resolveKnownErrorDescriptor,
  resolveKnownErrorUserMessage,
} from "../../common/error/resolve";
import { ErrorCode } from "../../common/error/types";
import { newProjectCommandErrorMapping } from "../../newProject/errorMapping";

suite("new project command errors", () => {
  suite("resolveKnownErrorUserMessage", () => {
    test("command mapping applies New Project output channel for wizard failures", () => {
      const descriptor = resolveKnownErrorDescriptor(
        newProjectWizardFailed("setup list unavailable"),
        newProjectCommandErrorMapping
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "New Project");
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          newProjectWizardFailed("setup list unavailable"),
          newProjectCommandErrorMapping
        ),
        "Failed to start the ESP-IDF New Project wizard."
      );
    });

    test("command mapping interpolates operation for ProjectScaffoldFailed", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          projectScaffoldFailed(
            "create the ESP-IDF project",
            "permission denied"
          ),
          newProjectCommandErrorMapping
        ),
        "Failed to create the ESP-IDF project."
      );
    });

    test("command mapping applies import-specific wording for ImportProjectFailed", () => {
      const descriptor = resolveKnownErrorDescriptor(
        importProjectFailed("copy failed"),
        newProjectCommandErrorMapping
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "New Project");
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          importProjectFailed("copy failed"),
          newProjectCommandErrorMapping
        ),
        "Failed to import the ESP-IDF project."
      );
    });
  });

  suite("known error factories", () => {
    test("projectScaffoldFailed preserves operation metadata", () => {
      const error = projectScaffoldFailed("add ESP-IDF VS Code files to the project");
      assert.ok(isKnownError(error));
      assert.strictEqual(error.code, ErrorCode.ProjectScaffoldFailed);
      assert.strictEqual(error.metadata?.operation, "add ESP-IDF VS Code files to the project");
    });
  });
});
