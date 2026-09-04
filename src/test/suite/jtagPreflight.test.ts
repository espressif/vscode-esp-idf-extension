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
import { ErrorCode } from "../../common/error/types";
import { isKnownError } from "../../common/error/knownError";
import {
  MIN_OPENOCD_VERSION_FOR_JTAG,
  assertOpenOcdVersionMeetsJtagMinimum,
} from "../../espIdf/openOcd/jtagPreflightVersion";

suite("JTAG OpenOCD preflight", () => {
  suite("assertOpenOcdVersionMeetsJtagMinimum", () => {
    test("passes when current version meets minimum", () => {
      assert.doesNotThrow(() =>
        assertOpenOcdVersionMeetsJtagMinimum("v0.12.0-esp32-20221013")
      );
    });

    test("throws OpenOcdVersionTooLow when current version is below minimum", () => {
      assert.throws(
        () => assertOpenOcdVersionMeetsJtagMinimum("v0.9.0-esp32-20200101"),
        (error: unknown) => {
          if (!isKnownError(error)) {
            return false;
          }
          return (
            error.code === ErrorCode.OpenOcdVersionTooLow &&
            error.metadata?.currentVersion === "v0.9.0-esp32-20200101" &&
            error.metadata?.minVersion === MIN_OPENOCD_VERSION_FOR_JTAG
          );
        }
      );
    });
  });
});
