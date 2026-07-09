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
  invalidConfiguration,
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
import { buildCommandErrorMapping } from "../../build/errorMapping";
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
    test("command mapping applies Build output channel for TaskFailedWithOutput", () => {
      const descriptor = resolveKnownErrorDescriptor(
        known(ErrorCode.TaskFailedWithOutput, { detail: "ninja failed" }),
        buildCommandErrorMapping
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "Build");
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          known(ErrorCode.TaskFailedWithOutput, { detail: "ninja failed" }),
          buildCommandErrorMapping
        ),
        "Build task failed. Check the terminal output for details."
      );
      assert.strictEqual(descriptor?.actions[0].label, "View Terminal Output");
    });

    test("command mapping applies build-specific wording for IdfTaskInProgress", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          idfTaskInProgress("flash"),
          buildCommandErrorMapping
        ),
        "Wait for ESP-IDF flash to finish before building."
      );
    });

    test("command mapping includes Set Target action for DfuTargetNotCompatible", () => {
      const descriptor = resolveKnownErrorDescriptor(
        dfuTargetNotCompatible("esp32"),
        buildCommandErrorMapping
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "Build");
      assert.strictEqual(
        descriptor?.userMessage,
        'The selected device target "esp32" is not compatible for DFU, as a result the dfu.bin was not created.'
      );
      assert.strictEqual(descriptor?.actions[0].label, "Set Target");
    });

    test("command mapping includes Build action for FlasherArgsMissing", () => {
      const descriptor = resolveKnownErrorDescriptor(
        flasherArgsMissing(),
        buildCommandErrorMapping
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "Build");
      assert.strictEqual(descriptor?.actions[0].label, "Build");
    });
  });

  suite("appendDfuExecution", () => {
    test("throws invalidConfiguration when idf.buildPath is missing", async () => {
      setIdfConfigurationSource(createFakeIdfSource());

      await assert.rejects(
        () => appendDfuExecution([], testWorkspaceUri),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.INVALID_CONFIGURATION &&
          error.metadata?.setting === "idf.buildPath"
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
          isKnownError(error) && error.code === ErrorCode.FlasherArgsMissing
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
