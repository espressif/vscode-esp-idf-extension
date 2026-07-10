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
  eimAssetNotFound,
  eimDownloadCanceled,
  eimDownloadFailed,
  environmentNotSupported,
  isKnownError,
} from "../../common/error/knownError";
import {
  resolveKnownErrorDescriptor,
  resolveKnownErrorUserMessage,
} from "../../common/error/resolve";
import { ErrorCode } from "../../common/error/types";

const eimErrorOptions = { outputChannel: "EIM" };

suite("EIM command errors", () => {
  suite("resolveKnownErrorUserMessage", () => {
    test("command mapping applies EIM output channel for EimDownloadFailed", () => {
      const descriptor = resolveKnownErrorDescriptor(
        eimDownloadFailed("network error"),
        eimErrorOptions
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "EIM");
      assert.strictEqual(descriptor?.actions[0].label, "Open Releases URL");
    });

    test("command mapping interpolates asset name for EimAssetNotFound", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          eimAssetNotFound("eim-cli-linux-x64.zip"),
          eimErrorOptions
        ),
        "No EIM release asset found for this platform: eim-cli-linux-x64.zip."
      );
    });

    test("command mapping applies info severity wording for EimDownloadCanceled", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(eimDownloadCanceled(), eimErrorOptions),
        "EIM download was canceled."
      );
    });

    test("command mapping applies environment wording for unsupported platform", () => {
      const error = environmentNotSupported("freebsd", {
        userMessage: "EIM is not supported on {envName}.",
        logMessage: "EIM install blocked: unsupported environment {envName}.",
        actions: [],
        outputChannel: "EIM",
      });
      assert.strictEqual(
        resolveKnownErrorUserMessage(error, eimErrorOptions),
        "EIM is not supported on freebsd."
      );
    });
  });

  suite("KnownError factories", () => {
    test("eimDownloadCanceled uses EimDownloadCanceled code", () => {
      const error = eimDownloadCanceled();
      assert.ok(isKnownError(error));
      assert.strictEqual(error.code, ErrorCode.EimDownloadCanceled);
    });
  });
});
