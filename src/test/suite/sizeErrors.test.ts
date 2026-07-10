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
  fileNotFound,
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
  runSizeTaskIfEnabled,
  setSizeExecutionTestHooks,
} from "../../build/sizeExecution";
import { IDFSize } from "../../espIdf/size/idfSize";
import { sizeErrorPresentation } from "../../espIdf/size/sizeErrorPresentation";

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

suite("size errors", () => {
  teardown(() => {
    setSizeExecutionTestHooks(undefined);
    resetIdfConfigurationSource();
  });

  suite("resolveKnownErrorUserMessage", () => {
    test("presentation includes Build action for FILE_NOT_FOUND", () => {
      const descriptor = resolveKnownErrorDescriptor(
        fileNotFound("/build/project.map", sizeErrorPresentation.fileNotFound)
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "Size");
      assert.strictEqual(
        descriptor?.userMessage,
        "ESP-IDF Size requires a build first. Build your project?"
      );
      assert.strictEqual(descriptor?.actions.length, 1);
      assert.strictEqual(descriptor?.actions[0].label, "Build");
    });

    test("presentation applies Size output channel for TaskFailedWithOutput", () => {
      const descriptor = resolveKnownErrorDescriptor(
        known(
          ErrorCode.TaskFailedWithOutput,
          { detail: "idf_size.py failed" },
          sizeErrorPresentation.taskFailedWithOutput
        )
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "Size");
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          known(
            ErrorCode.TaskFailedWithOutput,
            { detail: "idf_size.py failed" },
            sizeErrorPresentation.taskFailedWithOutput
          )
        ),
        "Size analysis failed. Check the output for details."
      );
      assert.strictEqual(descriptor?.actions[0].label, "View Output");
    });
  });

  suite("IDFSize", () => {
    test("throws fileNotFound when map file is absent", async () => {
      const buildDir = mkdtempSync(join(tmpdir(), "size-missing-map-"));
      writeFileSync(
        join(buildDir, "project_description.json"),
        JSON.stringify({ project_name: "app" })
      );
      setIdfConfigurationSource(
        createFakeIdfSource({
          "idf.buildPath": buildDir,
        })
      );

      const idfSize = new IDFSize(testWorkspaceUri);
      await assert.rejects(
        () =>
          idfSize.calculateWithProgress({
            report: () => undefined,
          }),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.FILE_NOT_FOUND &&
          String(error.metadata?.filePath).endsWith("app.map")
      );
    });
  });

  suite("runSizeTaskIfEnabled", () => {
    test("throws missingDependency when python path is missing", async () => {
      setIdfConfigurationSource(
        createFakeIdfSource({
          "idf.buildPath": "/build",
          "idf.enableSizeTaskAfterBuildTask": true,
        })
      );
      setSizeExecutionTestHooks({
        getVirtualEnvPythonPath: () => undefined,
      });

      await assert.rejects(
        () => runSizeTaskIfEnabled([], testWorkspaceUri),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.MISSING_DEPENDENCY &&
          error.metadata?.dependency === "Python"
      );
    });
  });
});
