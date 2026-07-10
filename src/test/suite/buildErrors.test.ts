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
import { mkdtempSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import * as vscode from "vscode";
import {
  dfuTargetNotCompatible,
  flasherArgsMissing,
  idfTaskInProgress,
  isKnownError,
  known,
} from "../../common/error/knownError";
import {
  resolveKnownErrorDescriptor,
  resolveKnownErrorUserMessage,
} from "../../common/error/resolve";
import { ErrorCode } from "../../common/error/types";
import {
  resetIdfConfigurationSource,
  setIdfConfigurationSource,
} from "../../configuration/idfConfigurationSource";
import {
  appendDfuExecution,
  setDfuExecutionTestHooks,
} from "../../build/dfuExecution";

const testWorkspaceUri = vscode.Uri.file("/test/workspace");

function createFakeIdfSource(getValues: Record<string, unknown> = {}) {
  return {
    getScoped(_section: string, _scope: unknown, key: string) {
      return Object.prototype.hasOwnProperty.call(getValues, key)
        ? getValues[key]
        : undefined;
    },
    inspectGlobal() {
      return undefined;
    },
    updateScoped: async () => undefined,
    updateGlobal: async () => undefined,
    refreshConfiguration: () => undefined,
  };
}

suite("build errors", () => {
  teardown(() => {
    setDfuExecutionTestHooks(undefined);
    resetIdfConfigurationSource();
  });

  suite("resolveKnownErrorUserMessage", () => {
    test("HandleErrorOptions fills Build output channel for TaskFailedWithOutput", () => {
      const descriptor = resolveKnownErrorDescriptor(
        known(ErrorCode.TaskFailedWithOutput, { detail: "ninja failed" }),
        { outputChannel: "Build" }
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "Build");
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          known(ErrorCode.TaskFailedWithOutput, { detail: "ninja failed" }),
          { outputChannel: "Build" }
        ),
        "Build task failed. Check the terminal output for details."
      );
      assert.strictEqual(descriptor?.actions[0].label, "View Terminal Output");
    });

    test("call-site presentation applies build-specific wording for IdfTaskInProgress", () => {
      const error = idfTaskInProgress("flash", {
        userMessage: "Wait for ESP-IDF {taskName} to finish before building.",
        logMessage: "Attempted to build while {taskName} is in progress.",
      });
      assert.strictEqual(
        resolveKnownErrorUserMessage(error),
        "Wait for ESP-IDF flash to finish before building."
      );
    });

    test("registry includes Set Target action for DfuTargetNotCompatible", () => {
      const descriptor = resolveKnownErrorDescriptor(
        dfuTargetNotCompatible("esp32"),
        { outputChannel: "Build" }
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "Build");
      assert.strictEqual(
        descriptor?.userMessage,
        'The selected device target "esp32" is not compatible for DFU, as a result the dfu.bin was not created.'
      );
      assert.strictEqual(descriptor?.actions[0].label, "Set Target");
    });

    test("call-site presentation includes Build action for FlasherArgsMissing", () => {
      const descriptor = resolveKnownErrorDescriptor(
        flasherArgsMissing({
          actions: [
            {
              label: "Build",
              execute: () => undefined,
            },
          ],
          outputChannel: "Build",
        })
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "Build");
      assert.strictEqual(descriptor?.actions[0].label, "Build");
    });
  });

  suite("appendDfuExecution", () => {
    test("throws flasherArgsMissing when idf.buildPath falls back and flasher_args.json is absent", async () => {
      setIdfConfigurationSource(createFakeIdfSource());

      await assert.rejects(
        () => appendDfuExecution([], testWorkspaceUri),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.FlasherArgsMissing &&
          error.presentation?.actions?.[0]?.label === "Build"
      );
    });

    test("throws flasherArgsMissing when flasher_args.json is absent", async () => {
      const buildDir = mkdtempSync(join(tmpdir(), "build-dfu-missing-args-"));
      setIdfConfigurationSource(
        createFakeIdfSource({
          "idf.buildPath": buildDir,
        })
      );

      await assert.rejects(
        () => appendDfuExecution([], testWorkspaceUri),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.FlasherArgsMissing &&
          error.presentation?.actions?.[0]?.label === "Build"
      );
    });

    test("throws dfuTargetNotCompatible for unsupported IDF target", async () => {
      const buildDir = mkdtempSync(join(tmpdir(), "build-dfu-target-"));
      writeFileSync(join(buildDir, "flasher_args.json"), "{}");
      setIdfConfigurationSource(
        createFakeIdfSource({
          "idf.buildPath": buildDir,
        })
      );
      setDfuExecutionTestHooks({
        getIdfTargetFromSdkconfig: async () => "esp32",
      });

      await assert.rejects(
        () => appendDfuExecution([], testWorkspaceUri),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.DfuTargetNotCompatible &&
          error.metadata?.target === "esp32"
      );
    });

    test("throws invalidConfiguration when IDF_PATH is missing", async () => {
      const buildDir = mkdtempSync(join(tmpdir(), "build-dfu-idf-path-"));
      writeFileSync(join(buildDir, "flasher_args.json"), "{}");
      setIdfConfigurationSource(
        createFakeIdfSource({
          "idf.buildPath": buildDir,
        })
      );
      setDfuExecutionTestHooks({
        getIdfTargetFromSdkconfig: async () => "esp32s3",
      });

      await assert.rejects(
        () => appendDfuExecution([], testWorkspaceUri),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.INVALID_CONFIGURATION &&
          error.metadata?.setting === "IDF_PATH"
      );
    });
  });
});
