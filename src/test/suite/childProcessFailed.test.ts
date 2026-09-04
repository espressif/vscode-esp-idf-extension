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
import { resolve } from "path";
import * as vscode from "vscode";
import {
  capturedProcessText,
  childProcessFailed,
  isKnownError,
} from "../../common/error/knownError";
import { Logger } from "../../common/logger";
import { ErrorCode } from "../../common/error/types";
import { execChildProcess as supportExecChildProcess } from "../../support/execChildProcess";
import { execChildProcess, spawn } from "../../utils";
import { createMockMemento } from "../mockUtils";

suite("ChildProcessFailed", () => {
  suiteSetup(() => {
    const absPath = (filename: string) =>
      resolve(__dirname, "..", "..", "..", filename);
    Logger.init({
      extensionPath: resolve(__dirname, "..", "..", ".."),
      asAbsolutePath: absPath,
      workspaceState: createMockMemento(),
      globalState: createMockMemento(),
    } as vscode.ExtensionContext);
  });

  suite("capturedProcessText", () => {
    test("joins stdout, stderr, and detail from KnownError metadata", () => {
      const error = childProcessFailed({
        stdout: "out",
        stderr: "err",
        detail: "spawn python ENOENT",
      });
      assert.strictEqual(capturedProcessText(error), "out\nerr\nspawn python ENOENT");
    });

    test("falls back to Error.message", () => {
      assert.strictEqual(
        capturedProcessText(new Error("plain failure")),
        "plain failure"
      );
    });
  });

  suite("utils.spawn", () => {
    test("rejects ChildProcessFailed with split streams on non-zero exit", async () => {
      await assert.rejects(
        () =>
          spawn(
            process.execPath,
            [
              "-e",
              "process.stdout.write('out-text'); process.stderr.write('err-text'); process.exit(2);",
            ],
            { silent: true, sendToTelemetry: false }
          ),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.ChildProcessFailed &&
          error.metadata?.stdout === "out-text" &&
          error.metadata?.stderr === "err-text" &&
          error.metadata?.exitCode === 2 &&
          error.metadata?.processCommand !== undefined
      );
    });

    test("keeps the raw command line with arguments in metadata", async () => {
      const script = "process.stderr.write('boom'); process.exit(1);";
      await assert.rejects(
        () =>
          spawn(process.execPath, ["-e", script], {
            silent: true,
            sendToTelemetry: false,
          }),
        (error: unknown) =>
          isKnownError(error) &&
          error.metadata?.commandLine ===
            `${process.execPath} -e "${script}"` &&
          !error.message.includes("commandLine")
      );
    });

    test("rejects ChildProcessFailed with spawnErrorCode on missing executable", async () => {
      await assert.rejects(
        () =>
          spawn("esp-idf-missing-binary-for-child-process-test", [], {
            silent: true,
            sendToTelemetry: false,
          }),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.ChildProcessFailed &&
          error.metadata?.spawnErrorCode === "ENOENT" &&
          typeof error.metadata?.detail === "string" &&
          (error.metadata.detail as string).length > 0
      );
    });
  });

  suite("execChildProcess", () => {
    test("utils.execChildProcess rejects ChildProcessFailed on non-zero exit", async () => {
      await assert.rejects(
        () =>
          execChildProcess(
            process.execPath,
            ["-e", "process.stderr.write('exec-err'); process.exit(3);"],
            process.cwd()
          ),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.ChildProcessFailed &&
          String(error.metadata?.stderr ?? "").includes("exec-err") &&
          error.metadata?.exitCode === 3
      );
    });

    test("support.execChildProcess rejects ChildProcessFailed on missing executable", async () => {
      await assert.rejects(
        () =>
          supportExecChildProcess(
            "esp-idf-missing-binary-for-child-process-test",
            [],
            process.cwd()
          ),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.ChildProcessFailed &&
          error.metadata?.spawnErrorCode === "ENOENT"
      );
    });
  });
});
