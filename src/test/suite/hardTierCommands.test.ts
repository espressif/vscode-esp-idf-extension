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
import { assertBuildFlashMonitorSucceeded } from "../../buildFlashMonitor";
import {
  espIdfSettingsRemovalFailed,
  flashEncryptionValidationFailed,
  isKnownError,
  known,
} from "../../common/error/knownError";
import { resolveKnownErrorUserMessage } from "../../common/error/resolve";
import { ErrorCode } from "../../common/error/types";
import {
  FlashCheckResultType,
  throwIfFlashEncryptionCheckFailed,
} from "../../flash/verify/flashEncryption";

suite("hard-tier commands", () => {
  suite("throwIfFlashEncryptionCheckFailed", () => {
    test("returns true when validation succeeds", () => {
      assert.strictEqual(
        throwIfFlashEncryptionCheckFailed({ success: true }),
        true
      );
    });

    test("returns false for first-step eFuse burn flow", () => {
      assert.strictEqual(
        throwIfFlashEncryptionCheckFailed({
          success: false,
          resultType: FlashCheckResultType.ErrorEfuseNotSet,
        }),
        false
      );
    });

    test("throws FlashEncryptionValidationFailed for blocking failures", () => {
      assert.throws(
        () =>
          throwIfFlashEncryptionCheckFailed({
            success: false,
            resultType: FlashCheckResultType.ErrorInvalidFlashType,
          }),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.FlashEncryptionValidationFailed &&
          error.metadata?.resultType === "ErrorInvalidFlashType"
      );
    });
  });

  suite("assertBuildFlashMonitorSucceeded", () => {
    test("throws TaskFailed when continueFlag is false", () => {
      assert.throws(
        () =>
          assertBuildFlashMonitorSucceeded({
            continueFlag: false,
            executions: [],
          }),
        (error: unknown) =>
          isKnownError(error) && error.code === ErrorCode.TaskFailed
      );
    });

    test("does not throw when continueFlag is true", () => {
      assert.doesNotThrow(() =>
        assertBuildFlashMonitorSucceeded({
          continueFlag: true,
          executions: [],
        })
      );
    });
  });

  suite("error mappings", () => {
    test("flash encryption validation uses Flash Encryption output channel", () => {
      const message = resolveKnownErrorUserMessage(
        flashEncryptionValidationFailed("ErrorEncryptionArgsRequired")
      );
      assert.strictEqual(
        message,
        "Flash encryption validation did not pass. See the Flash Encryption output for details."
      );
    });

    test("settings removal failure includes detail metadata", () => {
      const message = resolveKnownErrorUserMessage(
        espIdfSettingsRemovalFailed("permission denied")
      );
      assert.strictEqual(
        message,
        "Failed to remove ESP-IDF settings: permission denied"
      );
    });

    test("build-flash-monitor TaskFailed uses global registry message", () => {
      const message = resolveKnownErrorUserMessage(known(ErrorCode.TaskFailed));
      assert.strictEqual(
        message,
        "A task failed during execution. Please check the output for details."
      );
    });
  });
});
