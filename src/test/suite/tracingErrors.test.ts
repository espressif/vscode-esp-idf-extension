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
  buildRequiredBeforeFlash,
  heapTraceNotSupported,
  isKnownError,
  openOcdNotRunning,
  traceGdbProcessFailed,
  traceTclFailed,
} from "../../common/error/knownError";
import { resolveKnownErrorUserMessage } from "../../common/error/resolve";
import { ErrorCode } from "../../common/error/types";
import {
  appTraceCommandErrorMapping,
  heapTraceCommandErrorMapping,
} from "../../espIdf/tracing/errorMapping";
import {
  requireHeapTraceBuildDir,
  requireHeapTraceElf,
  requireHeapTraceGdb,
} from "../../espIdf/tracing/validation";

suite("Tracing errors", () => {
  suite("validation", () => {
    test("requireHeapTraceBuildDir throws BuildRequiredBeforeFlash when build dir missing", async () => {
      await assert.rejects(
        () => requireHeapTraceBuildDir("/missing/build"),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.BuildRequiredBeforeFlash &&
          error.metadata?.buildDirPath === "/missing/build"
      );
    });

    test("requireHeapTraceGdb throws IdfToolNotFound when gdb is not in PATH", () => {
      assert.throws(
        () => requireHeapTraceGdb("xtensa-esp32-elf-gdb", ""),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.IdfToolNotFound &&
          error.metadata?.toolName === "xtensa-esp32-elf-gdb"
      );
    });

    test("requireHeapTraceElf throws FILE_NOT_FOUND when elf is missing", () => {
      assert.throws(
        () => requireHeapTraceElf("/missing/project.elf", false),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.FILE_NOT_FOUND &&
          error.metadata?.filePath === "/missing/project.elf"
      );
    });
  });

  suite("knownError factories", () => {
    test("traceTclFailed carries detail and phase metadata", () => {
      const error = traceTclFailed("connection refused", "reset");
      assert.strictEqual(error.code, ErrorCode.TraceTclFailed);
      assert.strictEqual(error.metadata?.detail, "connection refused");
      assert.strictEqual(error.metadata?.phase, "reset");
    });

    test("heapTraceNotSupported has no metadata", () => {
      const error = heapTraceNotSupported();
      assert.strictEqual(error.code, ErrorCode.HeapTraceNotSupported);
    });

    test("traceGdbProcessFailed carries exitCode and detail metadata", () => {
      const error = traceGdbProcessFailed({ exitCode: 1, detail: "spawn failed" });
      assert.strictEqual(error.code, ErrorCode.TraceGdbProcessFailed);
      assert.strictEqual(error.metadata?.exitCode, 1);
      assert.strictEqual(error.metadata?.detail, "spawn failed");
    });
  });

  suite("resolveKnownErrorUserMessage", () => {
    test("appTraceCommandErrorMapping overrides OpenOcdNotRunning for tracing", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          openOcdNotRunning(),
          appTraceCommandErrorMapping
        ),
        "Can't perform tracing, because OpenOCD server is not running!"
      );
    });

    test("heapTraceCommandErrorMapping overrides BuildRequiredBeforeFlash for heap tracing", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          buildRequiredBeforeFlash("/project/build"),
          heapTraceCommandErrorMapping
        ),
        "Build is required before heap tracing. /project/build can't be accessed."
      );
    });

    test("appTraceCommandErrorMapping interpolates TraceTclFailed detail and phase", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          traceTclFailed("TCL socket error", "start"),
          appTraceCommandErrorMapping
        ),
        "App trace failed during start: TCL socket error"
      );
    });
  });
});
