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
import { join, resolve } from "path";
import * as vscode from "vscode";
import { isKnownError, known } from "../../common/error/knownError";
import {
  resolveKnownErrorDescriptor,
  resolveKnownErrorUserMessage,
} from "../../common/error/resolve";
import { ErrorCode } from "../../common/error/types";
import { Logger } from "../../common/logger";
import { ESP } from "../../config";
import {
  installEspSBOM,
  resolveEspSbomInvocation,
  sbomTaskFailedWithOutputPresentation,
} from "../../espBom/main";
import { addIdfReconfigureTask } from "../../espIdf/reconfigure/task";
import { getNinjaSummaryPythonPath } from "../../ninja/index";
import { ProjectConfigStore } from "../../project-conf";
import { createMockMemento } from "../mockUtils";

const testWorkspaceUri = vscode.Uri.file("/test/workspace");

suite("command errors", () => {
  suiteSetup(() => {
    const absPath = (filename: string) =>
      resolve(__dirname, "..", "..", "..", filename);
    const mockUpContext = {
      extensionPath: resolve(__dirname, "..", "..", ".."),
      asAbsolutePath: absPath,
      workspaceState: createMockMemento(),
      globalState: createMockMemento(),
    } as vscode.ExtensionContext;
    Logger.init(mockUpContext);
    ESP.ProjectConfiguration.store = ProjectConfigStore.resetForTests(mockUpContext);
  });

  suite("getNinjaSummaryPythonPath", () => {
    test("throws missingDependency when python path is missing", () => {
      assert.throws(
        () => getNinjaSummaryPythonPath(),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.MISSING_DEPENDENCY &&
          error.metadata?.dependency === "Python"
      );
    });
  });

  suite("addIdfReconfigureTask", () => {
    test("throws missingDependency when python path is missing", async () => {
      await assert.rejects(
        () => addIdfReconfigureTask(testWorkspaceUri),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.MISSING_DEPENDENCY &&
          error.metadata?.dependency === "Python"
      );
    });
  });

  suite("installEspSBOM", () => {
    test("throws missingDependency when python path is missing", async () => {
      await assert.rejects(
        () => installEspSBOM(testWorkspaceUri),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.MISSING_DEPENDENCY &&
          error.metadata?.dependency === "Python"
      );
    });
  });

  suite("SBOM TaskFailedWithOutput presentation", () => {
    test("call-site presentation overrides TaskFailedWithOutput user message", () => {
      const message = resolveKnownErrorUserMessage(
        known(
          ErrorCode.TaskFailedWithOutput,
          { exitCode: 1 },
          sbomTaskFailedWithOutputPresentation
        )
      );
      assert.strictEqual(
        message,
        "SBOM task failed. Check the terminal output for details."
      );
    });

    test("presentation uses SBOM output channel", () => {
      const descriptor = resolveKnownErrorDescriptor(
        known(
          ErrorCode.TaskFailedWithOutput,
          { exitCode: 1 },
          sbomTaskFailedWithOutputPresentation
        )
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "SBOM");
    });
  });

  suite("resolveEspSbomInvocation", () => {
    teardown(() => {
      ESP.ProjectConfiguration.store.set(
        ESP.ProjectConfiguration.CURRENT_IDF_CONFIGURATION,
        {}
      );
    });

    test("throws missingDependency when python path is missing", () => {
      assert.throws(
        () => resolveEspSbomInvocation(),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.MISSING_DEPENDENCY &&
          error.metadata?.dependency === "Python"
      );
    });

    test("uses venv Python with -m esp_idf_sbom", () => {
      const venvRoot = "/opt/esp/python_env/idf5.0_py3.11_env";
      ESP.ProjectConfiguration.store.set(
        ESP.ProjectConfiguration.CURRENT_IDF_CONFIGURATION,
        { IDF_PYTHON_ENV_PATH: venvRoot }
      );
      const invocation = resolveEspSbomInvocation();
      const expectedPython =
        process.platform === "win32"
          ? join(venvRoot, "Scripts", "python.exe")
          : join(venvRoot, "bin", "python3");
      assert.strictEqual(invocation.command, expectedPython);
      assert.deepStrictEqual(invocation.moduleArgs, ["-m", "esp_idf_sbom"]);
    });
  });
});
