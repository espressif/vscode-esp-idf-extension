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
import { isKnownError } from "../../common/error/knownError";
import { ErrorCode } from "../../common/error/types";
import { Logger } from "../../common/logger";
import { ESP } from "../../config";
import { installEspSBOM } from "../../espBom/main";
import { addIdfReconfigureTask } from "../../espIdf/reconfigure/task";
import { getNinjaSummaryPythonPath } from "../../ninja/index";
import { ProjectConfigStore } from "../../project-conf/utils";
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
});
