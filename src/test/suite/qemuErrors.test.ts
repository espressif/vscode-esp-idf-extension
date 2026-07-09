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
  idfToolNotFound,
  isKnownError,
  qemuDebugLaunchFailed,
  qemuLaunchArgsMissing,
  qemuTargetNotSupported,
} from "../../common/error/knownError";
import {
  resolveKnownErrorDescriptor,
  resolveKnownErrorUserMessage,
} from "../../common/error/resolve";
import { ErrorCode } from "../../common/error/types";
import { qemuCommandErrorMapping } from "../../qemu/errorMapping";

suite("QEMU command errors", () => {
  suite("resolveKnownErrorUserMessage", () => {
    test("command mapping applies QEMU output channel for QemuTargetNotSupported", () => {
      const descriptor = resolveKnownErrorDescriptor(
        qemuTargetNotSupported("esp32h2"),
        qemuCommandErrorMapping
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "QEMU");
      assert.ok(
        resolveKnownErrorUserMessage(
          qemuTargetNotSupported("esp32h2"),
          qemuCommandErrorMapping
        )?.includes("esp32h2")
      );
      assert.strictEqual(
        descriptor?.actions[0].label,
        "Open ESP-IDF Install Manager"
      );
    });

    test("command mapping applies QEMU-specific wording for IdfToolNotFound", () => {
      const descriptor = resolveKnownErrorDescriptor(
        idfToolNotFound("qemu-system-xtensa"),
        qemuCommandErrorMapping
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "QEMU");
      assert.ok(
        resolveKnownErrorUserMessage(
          idfToolNotFound("qemu-system-xtensa"),
          qemuCommandErrorMapping
        )?.includes("qemu-system-xtensa")
      );
    });

    test("command mapping includes detail for QemuDebugLaunchFailed", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          qemuDebugLaunchFailed("VS Code failed to start the debug session."),
          qemuCommandErrorMapping
        ),
        "Failed to launch GDB debugger for QEMU: VS Code failed to start the debug session."
      );
    });

    test("qemuLaunchArgsMissing maps to registry code", () => {
      const error = qemuLaunchArgsMissing();
      assert.ok(isKnownError(error));
      assert.strictEqual(error.code, ErrorCode.QemuLaunchArgsMissing);
    });
  });
});
