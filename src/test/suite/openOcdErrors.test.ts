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
import { resolveKnownErrorUserMessage } from "../../common/error/resolve";
import { CommandErrorMapping, ErrorCode } from "../../common/error/types";
import { ErrorSeverity } from "../../common/customNotifications";
import { openOcdCommandErrorMapping } from "../../espIdf/openOcd/errorMapping";
import {
  requireOpenOcdBinary,
  requireOpenOcdScripts,
  requireOpenOcdWorkspace,
} from "../../espIdf/openOcd/validation";

const flashJtagOpenOcdNotRunningMapping: CommandErrorMapping = {
  [ErrorCode.OpenOcdNotRunning]: {
    severity: ErrorSeverity.Warning,
    userMessage:
      "Can't perform JTAG flash, because OpenOCD server is not running!",
    logMessage: "OpenOCD server is not running after launch attempt.",
    actions: [],
    outputChannel: "Flash",
  },
};

const eraseJtagOpenOcdNotRunningMapping: CommandErrorMapping = {
  [ErrorCode.OpenOcdNotRunning]: {
    severity: ErrorSeverity.Warning,
    userMessage:
      "Can't perform JTAG erase, because OpenOCD server is not running!",
    logMessage: "OpenOCD server is not running after launch attempt.",
    actions: [],
    outputChannel: "Erase flash",
  },
};

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
    test("openOcdStartFailed carries detail metadata", () => {
      const error = openOcdStartFailed("adapter not found");
      assert.strictEqual(error.code, ErrorCode.OpenOcdStartFailed);
      assert.strictEqual(error.metadata?.detail, "adapter not found");
    });

    test("openOcdProcessExited carries exitCode metadata", () => {
      const error = openOcdProcessExited(1);
      assert.strictEqual(error.code, ErrorCode.OpenOcdProcessExited);
      assert.strictEqual(error.metadata?.exitCode, 1);
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

    test("openOcdCommandErrorMapping overrides INVALID_CONFIGURATION for OpenOCD command", () => {
      const error = idfToolNotFound("openocd");
      assert.ok(
        resolveKnownErrorUserMessage(error, openOcdCommandErrorMapping)?.includes(
          "openocd"
        )
      );
    });

    test("openOcdCommandErrorMapping interpolates OpenOcdStartFailed detail", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          openOcdStartFailed("Error: adapter not found"),
          openOcdCommandErrorMapping
        ),
        "OpenOCD server failed to start: Error: adapter not found"
      );
    });

    test("flash JTAG mapping preserves JTAG-specific OpenOcdNotRunning message", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          openOcdNotRunning(),
          flashJtagOpenOcdNotRunningMapping
        ),
        "Can't perform JTAG flash, because OpenOCD server is not running!"
      );
    });

    test("erase JTAG mapping preserves JTAG-specific OpenOcdNotRunning message", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          openOcdNotRunning(),
          eraseJtagOpenOcdNotRunningMapping
        ),
        "Can't perform JTAG erase, because OpenOCD server is not running!"
      );
    });
  });
});
