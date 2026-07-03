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
import { buildFlashMonitorCommandErrorMapping } from "../../buildFlashMonitor";
import { known } from "../../common/error/knownError";
import { resolveKnownErrorUserMessage } from "../../common/error/resolve";
import { ErrorCode } from "../../common/error/types";

suite("buildFlashMonitor", () => {
  suite("buildFlashMonitorCommandErrorMapping", () => {
    test("overrides TaskFailedWithOutput user message for composite command", () => {
      const message = resolveKnownErrorUserMessage(
        known(ErrorCode.TaskFailedWithOutput, { exitCode: 1 }),
        buildFlashMonitorCommandErrorMapping
      );
      assert.strictEqual(
        message,
        "Build, flash, or monitor task failed. Check the terminal output for details."
      );
    });
  });
});
