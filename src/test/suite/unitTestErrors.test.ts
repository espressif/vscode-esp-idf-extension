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
import { unitTestCommandErrorMapping } from "../../espIdf/unitTest/errorMapping";

suite("Unit test command errors", () => {
  suite("resolveKnownErrorUserMessage", () => {
    test("command mapping applies Unit Test output channel for AlreadyBuilding", () => {
      const descriptor = resolveKnownErrorDescriptor(
        alreadyBuilding(),
        unitTestCommandErrorMapping
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "Unit Test");
      assert.ok(
        resolveKnownErrorUserMessage(
          alreadyBuilding(),
          unitTestCommandErrorMapping
        )?.includes("unit test app")
      );
    });

    test("command mapping includes Select Port action for NoPortSelected", () => {
      const descriptor = resolveKnownErrorDescriptor(
        noPortSelected(),
        unitTestCommandErrorMapping
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.actions[0].label, "Select Port");
    });

    test("command mapping applies unit-test-specific wording for IdfTaskInProgress", () => {
      assert.ok(
        resolveKnownErrorUserMessage(
          idfTaskInProgress("flash"),
          unitTestCommandErrorMapping
        )?.includes("unit tests")
      );
    });

    test("missingDependency maps to Unit Test output channel", () => {
      const descriptor = resolveKnownErrorDescriptor(
        missingDependency("Extension"),
        unitTestCommandErrorMapping
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "Unit Test");
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
