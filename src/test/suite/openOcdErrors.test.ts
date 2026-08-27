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
  openOcdNoBoardsForTarget,
  openOcdNotRunning,
  openOcdProcessExited,
  openOcdStartFailed,
} from "../../common/error/knownError";
import {
  resolveKnownErrorDescriptor,
  resolveKnownErrorUserMessage,
} from "../../common/error/resolve";
import { ErrorCode } from "../../common/error/types";
import {
  requireOpenOcdBinary,
  requireOpenOcdScripts,
  requireOpenOcdWorkspace,
} from "../../espIdf/openOcd/validation";
import { flashJtagOpenOcdPresentation } from "../../flash/jtagOpenOcdPresentation";
import { eraseJtagOpenOcdPresentation } from "../../eraseFlash/jtagOpenOcdPresentation";

suite("OpenOCD errors", () => {
  suite("validation", () => {
    test("requireOpenOcdWorkspace throws NO_WORKSPACE_OPEN when workspace is undefined", () => {
      assert.throws(
        () => requireOpenOcdWorkspace(undefined),
        (error: unknown) =>
          isKnownError(error) && error.code === ErrorCode.NO_WORKSPACE_OPEN
      );
    });

    test("requireOpenOcdBinary throws IdfToolNotFound when path is empty", () => {
      assert.throws(
        () => requireOpenOcdBinary(""),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.IdfToolNotFound &&
          error.metadata?.toolName === "openocd"
      );
    });

    test("requireOpenOcdScripts throws MISSING_DEPENDENCY when OPENOCD_SCRIPTS is undefined", () => {
      assert.throws(
        () => requireOpenOcdScripts({}),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.MISSING_DEPENDENCY &&
          error.metadata?.dependency === "OPENOCD_SCRIPTS"
      );
    });
  });

  suite("knownError factories", () => {
    test("openOcdStartFailed carries detail and stream metadata", () => {
      const error = openOcdStartFailed("adapter not found", {
        stdout: "",
        stderr: "Error: adapter not found",
      });
      assert.strictEqual(error.code, ErrorCode.OpenOcdStartFailed);
      assert.strictEqual(error.metadata?.detail, "adapter not found");
      assert.strictEqual(error.metadata?.stderr, "Error: adapter not found");
    });

    test("openOcdProcessExited carries exitCode and stream metadata", () => {
      const error = openOcdProcessExited(1, {
        stdout: "out",
        stderr: "err",
      });
      assert.strictEqual(error.code, ErrorCode.OpenOcdProcessExited);
      assert.strictEqual(error.metadata?.exitCode, 1);
      assert.strictEqual(error.metadata?.stdout, "out");
      assert.strictEqual(error.metadata?.stderr, "err");
    });

    test("openOcdNoBoardsForTarget carries target metadata", () => {
      const error = openOcdNoBoardsForTarget("esp32s3");
      assert.strictEqual(error.code, ErrorCode.OpenOcdNoBoardsForTarget);
      assert.strictEqual(error.metadata?.target, "esp32s3");
    });
  });

  suite("resolveKnownErrorUserMessage", () => {
    test("registry default for OpenOcdNotRunning is context-neutral", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(openOcdNotRunning()),
        "OpenOCD server is not running."
      );
    });

    test("registry interpolates OpenOcdStartFailed detail", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          openOcdStartFailed("Error: adapter not found")
        ),
        "OpenOCD server failed to start: Error: adapter not found"
      );
    });

    test("registry interpolates IdfToolNotFound for openocd", () => {
      assert.ok(
        resolveKnownErrorUserMessage(idfToolNotFound("openocd"))?.includes(
          "openocd"
        )
      );
    });

    test("flash JTAG presentation preserves JTAG-specific OpenOcdNotRunning message", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          openOcdNotRunning(flashJtagOpenOcdPresentation.notRunning)
        ),
        "Can't perform JTAG flash, because OpenOCD server is not running!"
      );
      assert.strictEqual(
        resolveKnownErrorDescriptor(
          openOcdNotRunning(flashJtagOpenOcdPresentation.notRunning)
        )?.outputChannel,
        "Flash"
      );
    });

    test("erase JTAG presentation preserves JTAG-specific OpenOcdNotRunning message", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          openOcdNotRunning(eraseJtagOpenOcdPresentation.notRunning)
        ),
        "Can't perform JTAG erase, because OpenOCD server is not running!"
      );
      assert.strictEqual(
        resolveKnownErrorDescriptor(
          openOcdNotRunning(eraseJtagOpenOcdPresentation.notRunning)
        )?.outputChannel,
        "Erase flash"
      );
    });
  });
});
