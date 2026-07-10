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
  idfToolNotFound,
  invalidConfiguration,
  isKnownError,
  noSerialPort,
  openOcdNotRunning,
} from "../../common/error/knownError";
import {
  resolveKnownErrorUserMessage,
} from "../../common/error/resolve";
import { ErrorCode } from "../../common/error/types";
import { Logger } from "../../common/logger";
import { ESP } from "../../config";
import { resolveDapErrorMessage } from "../../debugAdapter/dapError";
import {
  debugDapErrorPresentation,
  debugErrorPresentation,
} from "../../debugAdapter/debugErrorPresentation";
import {
  requireBuildDirPath,
  resolveDebugGdb,
  resolveDebugProgram,
} from "../../debugAdapter/validation";
import {
  setReadSerialPortForTests,
  setVerifyAppTestHooks,
  verifyAppBinary,
} from "../../debugAdapter/verifyApp";
import {
  resetIdfConfigurationSource,
  setIdfConfigurationSource,
} from "../../configuration/idfConfigurationSource";
import { ProjectConfigStore } from "../../project-conf/utils";
import { createMockMemento } from "../mockUtils";

const testWorkspaceFolder = {
  uri: vscode.Uri.file("/test/workspace"),
  name: "test",
  index: 0,
} as vscode.WorkspaceFolder;

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

suite("debug errors", () => {
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

  teardown(() => {
    setReadSerialPortForTests(undefined);
    setVerifyAppTestHooks(undefined);
    ESP.ProjectConfiguration.store?.clear(
      ESP.ProjectConfiguration.SELECTED_CONFIG
    );
    resetIdfConfigurationSource();
  });

  suite("resolveKnownErrorUserMessage", () => {
    test("command override applies for FILE_NOT_FOUND", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          fileNotFound(
            "/proj/build/app.elf",
            debugErrorPresentation.fileNotFound
          )
        ),
        "Required file /proj/build/app.elf could not be found for the debug session."
      );
    });

    test("command override applies for OpenOcdNotRunning", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          openOcdNotRunning(debugErrorPresentation.openOcdNotRunning)
        ),
        "OpenOCD is not running. Please start OpenOCD before launching the debug session."
      );
    });

    test("command override applies for IdfToolNotFound", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          idfToolNotFound("gdb", debugErrorPresentation.idfToolNotFound)
        ),
        "Toolchain tool gdb was not found. Check your ESP-IDF setup."
      );
    });
  });

  suite("resolveDapErrorMessage", () => {
    test("maps KnownError through debug DAP mapping", () => {
      assert.strictEqual(
        resolveDapErrorMessage(
          invalidConfiguration(
            "program",
            debugDapErrorPresentation.invalidConfiguration
          )
        ),
        "Debug launch setting program is invalid or missing."
      );
    });

    test("falls back to Error message for unknown errors", () => {
      assert.strictEqual(
        resolveDapErrorMessage(new Error("plain failure")),
        "plain failure"
      );
    });
  });

  suite("validation", () => {
    test("requireBuildDirPath returns default build path when setting is unset", () => {
      setIdfConfigurationSource(createFakeIdfSource());
      assert.strictEqual(
        requireBuildDirPath(testWorkspaceFolder),
        join(testWorkspaceFolder.uri.fsPath, "build")
      );
    });

    test("resolveDebugProgram throws buildRequiredBeforeFlash when ELF missing", async () => {
      setIdfConfigurationSource(
        createFakeIdfSource({
          "idf.buildPath": "/test/workspace/build",
        })
      );
      await assert.rejects(
        () =>
          resolveDebugProgram(
            { type: "gdbtarget", name: "test", request: "launch" },
            testWorkspaceFolder
          ),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.BuildRequiredBeforeFlash
      );
    });
  });

  suite("verifyAppBinary", () => {
    test("throws noSerialPort when port is missing", async () => {
      setReadSerialPortForTests(async () => "");
      setIdfConfigurationSource(
        createFakeIdfSource({
          IDF_TARGET: "esp32",
        })
      );
      await assert.rejects(
        () => verifyAppBinary(testWorkspaceFolder.uri),
        (error: unknown) =>
          isKnownError(error) && error.code === ErrorCode.NoSerialPort
      );
    });

    test("throws missingDependency when Python env is missing", async () => {
      setReadSerialPortForTests(async () => "/dev/ttyUSB0");
      setIdfConfigurationSource(createFakeIdfSource());
      await assert.rejects(
        () => verifyAppBinary(testWorkspaceFolder.uri),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.MISSING_DEPENDENCY &&
          error.metadata?.dependency === "Python"
      );
    });

    test("throws flasherArgsMissing when flasher_args.json is absent", async () => {
      const idfRoot = mkdtempSync(join(tmpdir(), "debug-verify-idf-"));
      const esptoolDir = join(
        idfRoot,
        "components",
        "esptool_py",
        "esptool"
      );
      mkdirSync(esptoolDir, { recursive: true });
      writeFileSync(join(esptoolDir, "esptool.py"), "# stub\n");

      setReadSerialPortForTests(async () => "/dev/ttyUSB0");
      setVerifyAppTestHooks({
        getVirtualEnvPythonPath: () => "/usr/bin/python3",
        getCurrentIdfConfiguration: () => ({
          IDF_PATH: idfRoot,
          IDF_TARGET: "esp32",
        }),
      });
      setIdfConfigurationSource(
        createFakeIdfSource({
          "idf.buildPath": join("/missing", "build"),
        })
      );
      await assert.rejects(
        () => verifyAppBinary(testWorkspaceFolder.uri),
        (error: unknown) =>
          isKnownError(error) && error.code === ErrorCode.FlasherArgsMissing
      );
    });
  });
});
