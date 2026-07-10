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
  efuseSummaryFailed,
  idfVersionTooLow,
  invalidConfiguration,
  isKnownError,
  missingDependency,
  noSerialPort,
} from "../../common/error/knownError";
import {
  resolveKnownErrorDescriptor,
  resolveKnownErrorUserMessage,
} from "../../common/error/resolve";
import { ErrorCode } from "../../common/error/types";
import { efuseErrorPresentation } from "../../efuse/efuseErrorPresentation";

suite("eFuse command errors", () => {
  suite("resolveKnownErrorUserMessage", () => {
    test("presentation applies eFuse output channel for NoSerialPort", () => {
      const descriptor = resolveKnownErrorDescriptor(
        noSerialPort("esp32", efuseErrorPresentation.noSerialPort)
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "eFuse");
      assert.strictEqual(descriptor?.actions[0].label, "Select Port");
    });

    test("presentation applies eFuse-specific wording for IdfVersionTooLow", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          idfVersionTooLow(
            "4.3.x",
            "4.2.0",
            efuseErrorPresentation.idfVersionTooLow
          )
        ),
        "ESP-IDF v4.3.x or higher is required for the eFuse view (current: 4.2.0)."
      );
    });

    test("presentation includes Select Port action for EfuseSummaryFailed", () => {
      const descriptor = resolveKnownErrorDescriptor(
        efuseSummaryFailed(
          "espefuse.py failed",
          efuseErrorPresentation.efuseSummaryFailed
        )
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "eFuse");
      assert.strictEqual(descriptor?.actions[0].label, "Select Port");
    });

    test("presentation includes Install Manager action for missing IDF_PATH", () => {
      const descriptor = resolveKnownErrorDescriptor(
        invalidConfiguration(
          "IDF_PATH",
          efuseErrorPresentation.invalidConfiguration
        )
      );
      assert.ok(descriptor);
      assert.strictEqual(
        descriptor?.actions[0].label,
        "Open ESP-IDF Install Manager"
      );
    });
  });

  suite("ESPEFuseManager error factories", () => {
    test("missing Python maps to MISSING_DEPENDENCY", () => {
      const error = missingDependency("Python");
      assert.ok(isKnownError(error));
      assert.strictEqual(error.code, ErrorCode.MISSING_DEPENDENCY);
    });
  });
});
