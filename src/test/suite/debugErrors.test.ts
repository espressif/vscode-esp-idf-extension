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
import {
  fileNotFound,
  flasherArgsMissing,
  idfToolNotFound,
  invalidConfiguration,
  isKnownError,
  missingDependency,
  noSerialPort,
  openOcdNotRunning,
} from "../../common/error/knownError";
import {
  resolveKnownErrorUserMessage,
} from "../../common/error/resolve";
import { ErrorCode } from "../../common/error/types";
import { resolveDapErrorMessage } from "../../debugAdapter/dapError";
import {
  debugCommandErrorMapping,
  debugDapErrorMapping,
} from "../../debugAdapter/errorMapping";
import {
  requireBuildDirPath,
  resolveDebugGdb,
  resolveDebugProgram,
} from "../../debugAdapter/validation";
import {
  setReadSerialPortForTests,
  verifyAppBinary,
} from "../../debugAdapter/verifyApp";
import {
  resetIdfConfigurationSource,
  setIdfConfigurationSource,
} from "../../configuration/idfConfigurationSource";

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
  teardown(() => {
    setReadSerialPortForTests(undefined);
    resetIdfConfigurationSource();
  });

  suite("resolveKnownErrorUserMessage", () => {
    test("command override applies for FILE_NOT_FOUND", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          fileNotFound("/proj/build/app.elf"),
          debugCommandErrorMapping
        ),
        "Required file /proj/build/app.elf could not be found for the debug session."
      );
    });

    test("command override applies for OpenOcdNotRunning", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          openOcdNotRunning(),
          debugDapErrorMapping
        ),
        "OpenOCD is not running. Please start OpenOCD before launching the debug session."
      );
    });

    test("command override applies for IdfToolNotFound", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          idfToolNotFound("gdb"),
          debugCommandErrorMapping
        ),
        "Toolchain tool gdb was not found. Check your ESP-IDF setup."
      );
    });
  });

  suite("resolveDapErrorMessage", () => {
    test("maps KnownError through debug DAP mapping", () => {
      assert.strictEqual(
        resolveDapErrorMessage(invalidConfiguration("program")),
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
    test("requireBuildDirPath throws invalidConfiguration when build path missing", () => {
      setIdfConfigurationSource(createFakeIdfSource());
      assert.throws(
        () => requireBuildDirPath(testWorkspaceFolder),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.INVALID_CONFIGURATION &&
          error.metadata?.setting === "idf.buildPath"
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
      setReadSerialPortForTests(async () => "/dev/ttyUSB0");
      setIdfConfigurationSource(
        createFakeIdfSource({
          IDF_PATH: resolve(__dirname, "..", "..", ".."),
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
