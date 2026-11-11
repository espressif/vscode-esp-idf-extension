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
import { ExtensionContext, Uri, WorkspaceFolder } from "vscode";
import {
  importProjectFailed,
  isKnownError,
  newProjectWizardFailed,
  projectScaffoldFailed,
} from "../../common/error/knownError";
import {
  resolveKnownErrorDescriptor,
  resolveKnownErrorUserMessage,
} from "../../common/error/resolve";
import { ErrorCode } from "../../common/error/types";
import { Logger } from "../../common/logger";
import {
  resetIdfConfigurationSource,
  setIdfConfigurationSource,
} from "../../configuration/idfConfigurationSource";
import { setSerialPortModuleTestHooks } from "../../espIdf/serial/serialPort";
import { loadSerialPorts } from "../../newProject/newProjectInit";
import { createMockMemento } from "../mockUtils";

const newProjectErrorOptions = { outputChannel: "New Project" };

suite("new project command errors", () => {
  suite("resolveKnownErrorUserMessage", () => {
    test("command mapping applies New Project output channel for wizard failures", () => {
      const descriptor = resolveKnownErrorDescriptor(
        newProjectWizardFailed("setup list unavailable"),
        newProjectErrorOptions
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "New Project");
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          newProjectWizardFailed("setup list unavailable"),
          newProjectErrorOptions
        ),
        "Failed to start the ESP-IDF New Project wizard."
      );
    });

    test("command mapping interpolates operation for ProjectScaffoldFailed", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          projectScaffoldFailed(
            "create the ESP-IDF project",
            "permission denied"
          ),
          newProjectErrorOptions
        ),
        "Failed to create the ESP-IDF project."
      );
    });

    test("command mapping applies import-specific wording for ImportProjectFailed", () => {
      const descriptor = resolveKnownErrorDescriptor(
        importProjectFailed("copy failed"),
        newProjectErrorOptions
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "New Project");
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          importProjectFailed("copy failed"),
          newProjectErrorOptions
        ),
        "Failed to import the ESP-IDF project."
      );
    });
  });

  suite("loadSerialPorts", () => {
    const workspaceFolder: WorkspaceFolder = {
      uri: Uri.file("/test/workspace"),
      name: "workspace",
      index: 0,
    };

    suiteSetup(() => {
      const absPath = (filename: string) =>
        resolve(__dirname, "..", "..", "..", filename);
      Logger.init({
        extensionPath: resolve(__dirname, "..", "..", ".."),
        asAbsolutePath: absPath,
        workspaceState: createMockMemento(),
        globalState: createMockMemento(),
      } as ExtensionContext);
    });

    setup(() => {
      setIdfConfigurationSource({
        getScoped: () => undefined,
        inspectGlobal: () => undefined,
        updateScoped: async () => undefined,
        updateGlobal: async () => undefined,
        refreshConfiguration: () => undefined,
      });
    });

    teardown(() => {
      setSerialPortModuleTestHooks(undefined);
      resetIdfConfigurationSource();
    });

    test("keeps the detect option when no serial ports are available", async () => {
      setSerialPortModuleTestHooks({ listSerialPorts: async () => [] });
      assert.deepStrictEqual(await loadSerialPorts(workspaceFolder), [
        "detect",
      ]);
    });

    test("lists the detect option before the available ports", async () => {
      setSerialPortModuleTestHooks({
        listSerialPorts: async () => [
          { path: "COM3", manufacturer: "Silicon Labs" },
        ],
      });
      assert.deepStrictEqual(await loadSerialPorts(workspaceFolder), [
        "detect",
        "COM3",
      ]);
    });
  });

  suite("known error factories", () => {
    test("projectScaffoldFailed preserves operation metadata", () => {
      const error = projectScaffoldFailed(
        "add ESP-IDF VS Code files to the project"
      );
      assert.ok(isKnownError(error));
      assert.strictEqual(error.code, ErrorCode.ProjectScaffoldFailed);
      assert.strictEqual(
        error.metadata?.operation,
        "add ESP-IDF VS Code files to the project"
      );
    });
  });
});
