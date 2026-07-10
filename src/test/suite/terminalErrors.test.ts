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
  invalidConfiguration,
  isKnownError,
} from "../../common/error/knownError";
import { ErrorCode } from "../../common/error/types";
import { Logger } from "../../common/logger";
import { ESP } from "../../config";
import {
  resetIdfConfigurationSource,
  setIdfConfigurationSource,
} from "../../configuration/idfConfigurationSource";
import { IdfSetup } from "../../eim/types";
import {
  loadTerminalLaunchConfig,
  setGetCurrentIdfSetupForTests,
} from "../../terminal/launchConfig";
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

function minimalIdfSetup(overrides: Partial<IdfSetup> = {}): IdfSetup {
  return {
    id: "test-setup",
    version: "5.2",
    toolsPath: "/tools",
    idfPath: "/idf",
    gitPath: "/git",
    isValid: true,
    activationScript: "/idf/export.sh",
    python: "/python",
    sysPythonPath: "/syspython",
    ...overrides,
  };
}

function createValidTerminalFixture(): {
  extensionPath: string;
  idfPath: string;
  activationScript: string;
  workspacePath: string;
} {
  const root = mkdtempSync(join(tmpdir(), "terminal-errors-"));
  const extensionPath = join(root, "extension");
  const idfPath = join(root, "idf");
  const workspacePath = join(root, "workspace");
  const activationScript = join(idfPath, "export.sh");
  mkdirSync(extensionPath, { recursive: true });
  mkdirSync(idfPath, { recursive: true });
  mkdirSync(workspacePath, { recursive: true });
  writeFileSync(activationScript, "#!/bin/sh\n");
  return { extensionPath, idfPath, activationScript, workspacePath };
}

suite("terminal errors", () => {
  suiteSetup(() => {
    const mockUpContext = {
      extensionPath: resolve(__dirname, "..", "..", ".."),
      workspaceState: createMockMemento(),
      globalState: createMockMemento(),
    } as vscode.ExtensionContext;
    Logger.init(mockUpContext);
    ESP.ProjectConfiguration.store = ProjectConfigStore.init(mockUpContext);
    resetIdfConfigurationSource();
  });

  teardown(() => {
    setGetCurrentIdfSetupForTests(undefined);
    resetIdfConfigurationSource();
  });

  suite("loadTerminalLaunchConfig", () => {
    test("throws invalidConfiguration when ESP-IDF setup is missing", async () => {
      setGetCurrentIdfSetupForTests(async () => undefined);
      setIdfConfigurationSource(createFakeIdfSource());

      await assert.rejects(
        () =>
          loadTerminalLaunchConfig(testWorkspaceFolder, "/extension"),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.INVALID_CONFIGURATION &&
          error.metadata?.setting === "idf.currentSetup"
      );
    });

    test("throws invalidConfiguration when IDF_PATH is empty", async () => {
      setGetCurrentIdfSetupForTests(async () =>
        minimalIdfSetup({ idfPath: "" })
      );
      setIdfConfigurationSource(createFakeIdfSource());

      await assert.rejects(
        () =>
          loadTerminalLaunchConfig(testWorkspaceFolder, "/extension"),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.INVALID_CONFIGURATION &&
          error.metadata?.setting === "IDF_PATH"
      );
    });

    test("throws fileNotFound when IDF path does not exist", async () => {
      const missingIdfPath = join(tmpdir(), "missing-idf-path");
      setGetCurrentIdfSetupForTests(async () =>
        minimalIdfSetup({ idfPath: missingIdfPath })
      );
      setIdfConfigurationSource(createFakeIdfSource());

      await assert.rejects(
        () =>
          loadTerminalLaunchConfig(testWorkspaceFolder, "/extension"),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.FILE_NOT_FOUND &&
          error.metadata?.filePath === missingIdfPath
      );
    });

    test("throws fileNotFound when activation script is missing", async () => {
      const fixture = createValidTerminalFixture();
      setGetCurrentIdfSetupForTests(async () =>
        minimalIdfSetup({
          idfPath: fixture.idfPath,
          activationScript: join(fixture.idfPath, "missing-export.sh"),
        })
      );
      setIdfConfigurationSource(createFakeIdfSource());

      await assert.rejects(
        () =>
          loadTerminalLaunchConfig(
            testWorkspaceFolder,
            fixture.extensionPath
          ),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.FILE_NOT_FOUND &&
          error.metadata?.filePath ===
            join(fixture.idfPath, "missing-export.sh")
      );
    });

    test("throws fileNotFound when custom shell executable is missing", async function () {
      if (process.platform === "win32") {
        this.skip();
      }
      const fixture = createValidTerminalFixture();
      const missingShell = join(fixture.extensionPath, "missing-shell");
      setGetCurrentIdfSetupForTests(async () =>
        minimalIdfSetup({
          idfPath: fixture.idfPath,
          activationScript: fixture.activationScript,
        })
      );
      setIdfConfigurationSource(
        createFakeIdfSource({
          "idf.customTerminalExecutable": missingShell,
        })
      );

      await assert.rejects(
        () =>
          loadTerminalLaunchConfig(
            testWorkspaceFolder,
            fixture.extensionPath
          ),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.FILE_NOT_FOUND &&
          error.metadata?.filePath === missingShell
      );
    });

    test("returns resolved config when inputs are valid", async () => {
      const fixture = createValidTerminalFixture();
      const workspaceFolder = {
        uri: vscode.Uri.file(fixture.workspacePath),
        name: "workspace",
        index: 0,
      } as vscode.WorkspaceFolder;
      setGetCurrentIdfSetupForTests(async () =>
        minimalIdfSetup({
          idfPath: fixture.idfPath,
          activationScript: fixture.activationScript,
        })
      );
      setIdfConfigurationSource(createFakeIdfSource());

      const config = await loadTerminalLaunchConfig(
        workspaceFolder,
        fixture.extensionPath
      );

      assert.strictEqual(config.cwd, fixture.workspacePath);
      assert.strictEqual(config.activationScriptPath, fixture.activationScript);
      assert.ok(config.shellPath);
      assert.ok(Array.isArray(config.shellArgs));
      assert.ok(typeof config.env === "object");
    });
  });
});
