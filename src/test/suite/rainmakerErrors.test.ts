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
  isKnownError,
  rainmakerLoginFailed,
  rainmakerNodeDeleteFailed,
  rainmakerParamUpdateFailed,
} from "../../common/error/knownError";
import {
  resolveKnownErrorDescriptor,
  resolveKnownErrorUserMessage,
} from "../../common/error/resolve";
import { ErrorCode } from "../../common/error/types";
import { rainmakerCommandErrorMapping } from "../../rainmaker/errorMapping";

suite("rainmaker command errors", () => {
  suite("resolveKnownErrorUserMessage", () => {
    test("command mapping applies Rainmaker output channel for login failures", () => {
      const descriptor = resolveKnownErrorDescriptor(
        rainmakerLoginFailed("invalid credentials"),
        rainmakerCommandErrorMapping
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "Rainmaker");
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          rainmakerLoginFailed("invalid credentials"),
          rainmakerCommandErrorMapping
        ),
        "Failed to login with Rainmaker Cloud, double check your id and password."
      );
    });

    test("command mapping preserves delete-node guidance", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          rainmakerNodeDeleteFailed("node pending delete"),
          rainmakerCommandErrorMapping
        ),
        "Failed to delete node, maybe the node is already marked for delete, please try again after sometime."
      );
    });

    test("command mapping interpolates API detail for param update failures", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          rainmakerParamUpdateFailed("invalid value for brightness"),
          rainmakerCommandErrorMapping
        ),
        "Failed to update param because, invalid value for brightness"
      );
    });
  });

  suite("known error factories", () => {
    test("rainmakerParamUpdateFailed is a KnownError with detail metadata", () => {
      const error = rainmakerParamUpdateFailed("please try once more");
      assert.ok(isKnownError(error));
      assert.strictEqual(error.code, ErrorCode.RainmakerParamUpdateFailed);
      assert.strictEqual(error.metadata?.detail, "please try once more");
    });
  });
});
