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
import { mkdirSync, mkdtempSync, writeFileSync } from "fs";
import { join, resolve } from "path";
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
import { Logger } from "../../common/logger";
import { ESP } from "../../config";
import {
  resetIdfConfigurationSource,
  setIdfConfigurationSource,
} from "../../configuration/idfConfigurationSource";
import {
  runSizeTaskIfEnabled,
  setSizeExecutionTestHooks,
} from "../../build/sizeExecution";
import { IDFSize, idfSizeCliArgs } from "../../espIdf/size/idfSize";
import { sizeErrorPresentation } from "../../espIdf/size/sizeErrorPresentation";
import { ProjectConfigStore } from "../../project-conf";
import { createMockMemento } from "../mockUtils";

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
    ESP.ProjectConfiguration.store = ProjectConfigStore.resetForTests(
      mockUpContext
    );
  });

  teardown(() => {
    setSizeExecutionTestHooks(undefined);
    ESP.ProjectConfiguration.store?.clear(
      ESP.ProjectConfiguration.SELECTED_CONFIG
    );
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

    test("presentation applies Size output channel for ChildProcessFailed", () => {
      const descriptor = resolveKnownErrorDescriptor(
        known(
          ErrorCode.ChildProcessFailed,
          { detail: "idf_size.py failed" },
          sizeErrorPresentation.childProcessFailed
        )
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "Size");
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          known(
            ErrorCode.ChildProcessFailed,
            { detail: "idf_size.py failed" },
            sizeErrorPresentation.childProcessFailed
          )
        ),
        "Size analysis failed. Check the output for details."
      );
      assert.strictEqual(descriptor?.actions[0].label, "View Output");
      assert.strictEqual(descriptor?.actions[1].label, "Ask AI to Fix");
    });

    test("omitting actions keeps Install Manager for MISSING_DEPENDENCY", () => {
      const descriptor = resolveKnownErrorDescriptor(
        known(
          ErrorCode.MISSING_DEPENDENCY,
          { dependency: "Python" },
          sizeErrorPresentation.missingDependency
        )
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "Size");
      assert.strictEqual(
        descriptor?.actions[0].label,
        "Open ESP-IDF Install Manager"
      );
    });
  });

  suite("idfSizeCliArgs", () => {
    test("ESP-IDF 6.0+ uses --files and json2", () => {
      assert.deepStrictEqual(idfSizeCliArgs("6.0.0"), {
        formatArgs: ["--format", "json2"],
        filesFlag: "--files",
      });
      assert.deepStrictEqual(idfSizeCliArgs("6.1.0"), {
        formatArgs: ["--format", "json2"],
        filesFlag: "--files",
      });
    });

    test("ESP-IDF 5.5 uses --file and json2", () => {
      assert.deepStrictEqual(idfSizeCliArgs("5.5.0"), {
        formatArgs: ["--format", "json2"],
        filesFlag: "--file",
      });
    });

    test("ESP-IDF 5.2 uses --file and json", () => {
      assert.deepStrictEqual(idfSizeCliArgs("5.2.0"), {
        formatArgs: ["--format", "json"],
        filesFlag: "--file",
      });
    });

    test("ESP-IDF 5.0 uses --file and --json", () => {
      assert.deepStrictEqual(idfSizeCliArgs("5.0.0"), {
        formatArgs: ["--json"],
        filesFlag: "--file",
      });
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

    test("passes the map file path as the value of the files flag", async () => {
      const idfRoot = mkdtempSync(join(tmpdir(), "size-idf-root-"));
      mkdirSync(join(idfRoot, "tools", "cmake"), { recursive: true });
      writeFileSync(
        join(idfRoot, "tools", "cmake", "version.cmake"),
        "set(IDF_VERSION_MAJOR 6)\nset(IDF_VERSION_MINOR 0)\nset(IDF_VERSION_PATCH 0)\n"
      );
      ESP.ProjectConfiguration.store.set(
        ESP.ProjectConfiguration.CURRENT_IDF_CONFIGURATION,
        { IDF_PATH: idfRoot }
      );

      const idfSize = new IDFSize(testWorkspaceUri);
      const calls: string[][] = [];
      (idfSize as any).resolveMapFilePath = async () => "/tmp/app.map";
      (idfSize as any).idfCommandInvoker = async (args: string[]) => {
        calls.push(args);
        return {};
      };

      await idfSize.calculateWithProgress({
        report: () => undefined,
      });

      assert.deepStrictEqual(calls[2], [
        "idf_size.py",
        "--files",
        "/tmp/app.map",
        "--format",
        "json2",
      ]);
    });
  });

  suite("runSizeTaskIfEnabled", () => {
    test("throws missingDependency when python path is missing", async () => {
      const buildDir = mkdtempSync(join(tmpdir(), "size-missing-python-"));
      writeFileSync(
        join(buildDir, "project_description.json"),
        JSON.stringify({ project_name: "app" })
      );
      setIdfConfigurationSource(
        createFakeIdfSource({
          "idf.buildPath": buildDir,
          "idf.enableSizeTaskAfterBuildTask": true,
        })
      );
      setSizeExecutionTestHooks({
        getVirtualEnvPythonPath: () => undefined,
      });

      await assert.rejects(
        () => runSizeTaskIfEnabled(testWorkspaceUri),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.MISSING_DEPENDENCY &&
          error.metadata?.dependency === "Python"
      );
    });
  });
});
