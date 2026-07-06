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
import { mkdtempSync, mkdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { tmpdir } from "os";
import * as vscode from "vscode";
import { Uri } from "vscode";
import {
  confserverProcessFailed,
  confserverProtocolError,
  fileNotFound,
  isKnownError,
} from "../../common/error/knownError";
import { resolveKnownErrorUserMessage } from "../../common/error/resolve";
import { ErrorCode } from "../../common/error/types";
import { Logger } from "../../common/logger";
import { ESP } from "../../config";
import { KconfigMenuLoader } from "../../espIdf/menuconfig/kconfigMenus/loader";
import { menuconfigCommandErrorMapping } from "../../espIdf/menuconfig/errorMapping";
import { kconfigMenusPath, requireIdfPath, requireKconfigMenusJson } from "../../espIdf/menuconfig/validation";
import { ProjectConfElement } from "../../project-conf/projectConfiguration";
import { ProjectConfigStore } from "../../project-conf/utils";
import {
  IdfConfigurationSource,
  IdfInspectResult,
  resetIdfConfigurationSource,
  setIdfConfigurationSource,
} from "../../configuration/idfConfigurationSource";
import { createMockMemento } from "../mockUtils";

const PROFILE = "menuconfig-test-profile";

function minimalProjectConf(
  overrides: Partial<ProjectConfElement> = {}
): ProjectConfElement {
  const base: ProjectConfElement = {
    build: {
      compileArgs: [],
      ninjaArgs: [],
      buildDirectoryPath: "",
      sdkconfigDefaults: [],
      sdkconfigFilePath: "",
    },
    env: {},
    idfTarget: "esp32",
    flashBaudRate: "",
    monitorBaudRate: "",
    openOCD: { debugLevel: 0, configs: [], args: [] },
    tasks: { preBuild: "", preFlash: "", postBuild: "", postFlash: "" },
  };
  return {
    ...base,
    ...overrides,
    build: { ...base.build, ...overrides.build },
    env: overrides.env ?? base.env,
    openOCD: { ...base.openOCD, ...overrides.openOCD },
    tasks: { ...base.tasks, ...overrides.tasks },
  };
}

function createFakeIdfSource(options: {
  getValues?: Record<string, unknown>;
  inspectValues?: Record<string, IdfInspectResult | undefined>;
  throwOnGetScoped?: boolean;
}): IdfConfigurationSource {
  const getValues = options.getValues ?? {};
  const inspectValues = options.inspectValues ?? {};
  return {
    getScoped(_section, _scope, key) {
      if (options.throwOnGetScoped) {
        throw new Error("getScoped should not be called");
      }
      return Object.prototype.hasOwnProperty.call(getValues, key)
        ? getValues[key]
        : undefined;
    },
    inspectGlobal(key) {
      return inspectValues[key];
    },
    updateScoped: async () => undefined,
    updateGlobal: async () => undefined,
    refreshConfiguration: () => undefined,
  };
}

function seedSelectedProfile(conf: ProjectConfElement) {
  const store = ESP.ProjectConfiguration.store;
  store.set(ESP.ProjectConfiguration.SELECTED_CONFIG, PROFILE);
  store.set(PROFILE, conf);
}

suite("menuconfig errors", () => {
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
    resetIdfConfigurationSource();
  });

  suite("KnownError factories", () => {
    test("confserverProcessFailed carries phase and exit metadata", () => {
      const error = confserverProcessFailed("reconfigure", {
        exitCode: 1,
        detail: "stderr output",
      });
      assert.strictEqual(isKnownError(error), true);
      assert.strictEqual(error.code, ErrorCode.ConfserverProcessFailed);
      assert.strictEqual(error.metadata?.phase, "reconfigure");
      assert.strictEqual(error.metadata?.exitCode, 1);
      assert.strictEqual(error.metadata?.detail, "stderr output");
    });

    test("confserverProtocolError carries detail metadata", () => {
      const error = confserverProtocolError("invalid symbol");
      assert.strictEqual(error.code, ErrorCode.ConfserverProtocolError);
      assert.strictEqual(error.metadata?.detail, "invalid symbol");
    });
  });

  suite("resolveKnownErrorUserMessage", () => {
    test("interpolates phase for ConfserverProcessFailed", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          confserverProcessFailed("startup", { detail: "spawn failed" })
        ),
        "SDK Configuration editor process failed during startup."
      );
    });

    test("interpolates detail for ConfserverProtocolError", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(confserverProtocolError("bad request")),
        "SDK Configuration editor returned an error: bad request."
      );
    });

    test("command override applies for FILE_NOT_FOUND", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          fileNotFound("/build/config/kconfig_menus.json"),
          menuconfigCommandErrorMapping
        ),
        "Menuconfig menus file not found at /build/config/kconfig_menus.json. Build the project first."
      );
    });
  });

  suite("validation", () => {
    test("requireIdfPath throws invalidConfiguration when IDF_PATH is missing", () => {
      assert.throws(
        () => requireIdfPath({}),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.INVALID_CONFIGURATION &&
          error.metadata?.setting === "IDF_PATH"
      );
    });

    test("kconfigMenusPath joins build dir with config/kconfig_menus.json", () => {
      seedSelectedProfile(
        minimalProjectConf({
          build: {
            compileArgs: [],
            ninjaArgs: [],
            buildDirectoryPath: "/tmp/project-build",
            sdkconfigDefaults: [],
            sdkconfigFilePath: "",
          },
        })
      );
      setIdfConfigurationSource(createFakeIdfSource({ throwOnGetScoped: true }));
      const workspace = Uri.file("/tmp/project");
      assert.strictEqual(
        kconfigMenusPath(workspace),
        join("/tmp/project-build", "config", "kconfig_menus.json")
      );
    });

    test("requireKconfigMenusJson throws fileNotFound when kconfig_menus.json is missing", async () => {
      const buildDir = mkdtempSync(join(tmpdir(), "menuconfig-build-"));
      seedSelectedProfile(
        minimalProjectConf({
          build: {
            compileArgs: [],
            ninjaArgs: [],
            buildDirectoryPath: buildDir,
            sdkconfigDefaults: [],
            sdkconfigFilePath: "",
          },
        })
      );
      setIdfConfigurationSource(createFakeIdfSource({ throwOnGetScoped: true }));
      const workspace = Uri.file(join(buildDir, "project"));
      await assert.rejects(
        () => requireKconfigMenusJson(workspace),
        (error: unknown) =>
          isKnownError(error) && error.code === ErrorCode.FILE_NOT_FOUND
      );
    });

    test("requireKconfigMenusJson throws parseError when kconfig_menus.json is invalid JSON", async () => {
      const buildDir = mkdtempSync(join(tmpdir(), "menuconfig-build-"));
      const configDir = join(buildDir, "config");
      mkdirSync(configDir, { recursive: true });
      writeFileSync(join(configDir, "kconfig_menus.json"), "{ invalid", "utf-8");
      seedSelectedProfile(
        minimalProjectConf({
          build: {
            compileArgs: [],
            ninjaArgs: [],
            buildDirectoryPath: buildDir,
            sdkconfigDefaults: [],
            sdkconfigFilePath: "",
          },
        })
      );
      setIdfConfigurationSource(createFakeIdfSource({ throwOnGetScoped: true }));
      const workspace = Uri.file(join(buildDir, "project"));
      await assert.rejects(
        () => requireKconfigMenusJson(workspace),
        (error: unknown) =>
          isKnownError(error) && error.code === ErrorCode.PARSE_ERROR
      );
    });
  });

  suite("KconfigMenuLoader", () => {
    test("delegates kconfig_menus validation to requireKconfigMenusJson", async () => {
      const buildDir = mkdtempSync(join(tmpdir(), "menuconfig-build-"));
      seedSelectedProfile(
        minimalProjectConf({
          build: {
            compileArgs: [],
            ninjaArgs: [],
            buildDirectoryPath: buildDir,
            sdkconfigDefaults: [],
            sdkconfigFilePath: "",
          },
        })
      );
      setIdfConfigurationSource(createFakeIdfSource({ throwOnGetScoped: true }));
      const workspace = Uri.file(join(buildDir, "project"));
      const loader = new KconfigMenuLoader(workspace);
      await assert.rejects(
        () => loader.initMenuconfigServer(),
        (error: unknown) =>
          isKnownError(error) && error.code === ErrorCode.FILE_NOT_FOUND
      );
    });

    test("throws parseError when kconfig_menus.json is invalid JSON", async () => {
      const buildDir = mkdtempSync(join(tmpdir(), "menuconfig-build-"));
      const configDir = join(buildDir, "config");
      mkdirSync(configDir, { recursive: true });
      writeFileSync(join(configDir, "kconfig_menus.json"), "{ invalid", "utf-8");
      seedSelectedProfile(
        minimalProjectConf({
          build: {
            compileArgs: [],
            ninjaArgs: [],
            buildDirectoryPath: buildDir,
            sdkconfigDefaults: [],
            sdkconfigFilePath: "",
          },
        })
      );
      setIdfConfigurationSource(createFakeIdfSource({ throwOnGetScoped: true }));
      const workspace = Uri.file(join(buildDir, "project"));
      const loader = new KconfigMenuLoader(workspace);
      await assert.rejects(
        () => loader.initMenuconfigServer(),
        (error: unknown) =>
          isKnownError(error) && error.code === ErrorCode.PARSE_ERROR
      );
    });
  });
});
