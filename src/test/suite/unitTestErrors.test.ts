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
  alreadyBuilding,
  idfTaskInProgress,
  isKnownError,
  missingDependency,
  noPortSelected,
  unitTestTaskFailed,
} from "../../common/error/knownError";
import {
  resolveKnownErrorDescriptor,
  resolveKnownErrorUserMessage,
} from "../../common/error/resolve";
import { ErrorCode } from "../../common/error/types";
import { unitTestErrorPresentation } from "../../espIdf/unitTest/unitTestErrorPresentation";

suite("Unit test command errors", () => {
  suite("resolveKnownErrorUserMessage", () => {
    test("presentation applies Unit Test output channel for AlreadyBuilding", () => {
      const descriptor = resolveKnownErrorDescriptor(
        alreadyBuilding(unitTestErrorPresentation.alreadyBuilding)
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "Unit Test");
    });

    test("presentation includes Select Port action for NoPortSelected", () => {
      const descriptor = resolveKnownErrorDescriptor(
        noPortSelected(unitTestErrorPresentation.noPortSelected)
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.actions[0].label, "Select Port");
    });

    test("presentation resolves IdfTaskInProgress", () => {
      assert.ok(
        resolveKnownErrorUserMessage(
          idfTaskInProgress(
            "flash",
            unitTestErrorPresentation.idfTaskInProgress
          )
        )
      );
    });

    test("presentation maps missingDependency to Unit Test output channel", () => {
      const descriptor = resolveKnownErrorDescriptor(
        missingDependency(
          "Extension",
          unitTestErrorPresentation.missingDependency
        )
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "Unit Test");
      assert.strictEqual(
        descriptor?.actions[0].label,
        "Open ESP-IDF Install Manager"
      );
    });
  });

  suite("known error factories", () => {
    test("unitTestTaskFailed maps to registry code", () => {
      const error = unitTestTaskFailed("build failed");
      assert.ok(isKnownError(error));
      assert.strictEqual(error.code, ErrorCode.UnitTestTaskFailed);
      assert.strictEqual(error.metadata?.detail, "build failed");
    });
  });
});
