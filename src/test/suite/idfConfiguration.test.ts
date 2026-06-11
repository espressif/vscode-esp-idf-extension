/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import * as assert from "assert";
import * as vscode from "vscode";
import { resolve } from "path";
import { ESP } from "../../config";
import { Logger } from "../../common/logger";
import { ProjectConfigStore } from "../../project-conf";
import { ProjectConfElement } from "../../project-conf/projectConfiguration";
import { createMockMemento } from "../mockUtils";
import {
  addWinIfRequired,
  checkTypeOfConfiguration,
  parameterToProjectConfigMap,
  parseStrToArray,
  readParameter,
  resolveVariables,
} from "../../configuration/idf";
import {
  IdfConfigurationSource,
  IdfInspectResult,
  resetIdfConfigurationSource,
  setIdfConfigurationSource,
} from "../../configuration/idfConfigurationSource";

const PROFILE = "test-profile";

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

suite("configuration/idf.ts", () => {
  const absPath = (filename: string) =>
    resolve(__dirname, "..", "..", "..", filename);
  const mockUpContext: vscode.ExtensionContext = {
    extensionPath: resolve(__dirname, "..", "..", ".."),
    asAbsolutePath: absPath,
    workspaceState: createMockMemento(),
    globalState: createMockMemento(),
  } as vscode.ExtensionContext;

  suiteSetup(() => {
    Logger.init(mockUpContext);
    ESP.ProjectConfiguration.store = ProjectConfigStore.init(mockUpContext);
    resetIdfConfigurationSource();
  });

  teardown(() => {
    resetIdfConfigurationSource();
  });

  function seedSelectedProfile(conf: ProjectConfElement) {
    const store = ESP.ProjectConfiguration.store;
    store.set(ESP.ProjectConfiguration.SELECTED_CONFIG, PROFILE);
    store.set(PROFILE, conf);
  }

  suite("parseStrToArray", () => {
    test("splits on commas and trims entries", () => {
      assert.deepStrictEqual(parseStrToArray(" a , b , c "), ["a", "b", "c"]);
    });

    test("drops empty segments", () => {
      assert.deepStrictEqual(parseStrToArray("x,, y"), ["x", "y"]);
    });
  });

  suite("addWinIfRequired", () => {
    test("leaves keys that are not platform-dependent unchanged", () => {
      assert.strictEqual(addWinIfRequired("idf.customExtraVars"), "idf.customExtraVars");
    });

    test("appends Win suffix on win32 for platform-dependent keys", () => {
      if (process.platform === "win32") {
        assert.strictEqual(addWinIfRequired("idf.buildPath"), "idf.buildPathWin");
      } else {
        assert.strictEqual(addWinIfRequired("idf.buildPath"), "idf.buildPath");
      }
    });
  });

  suite("parameterToProjectConfigMap", () => {
    test("returns empty string when project configuration store is missing", () => {
      const prev = ESP.ProjectConfiguration.store;
      (ESP.ProjectConfiguration as { store?: ProjectConfigStore }).store =
        undefined as unknown as ProjectConfigStore;
      try {
        assert.strictEqual(parameterToProjectConfigMap("idf.buildPath"), "");
      } finally {
        ESP.ProjectConfiguration.store = prev;
      }
    });

    test("returns empty string when no profile is selected", () => {
      ESP.ProjectConfiguration.store.clear(ESP.ProjectConfiguration.SELECTED_CONFIG);
      assert.strictEqual(parameterToProjectConfigMap("idf.buildPath"), "");
    });

    test("maps build path and ninja args from the active profile", () => {
      seedSelectedProfile(
        minimalProjectConf({
          build: {
            compileArgs: [],
            ninjaArgs: ["-j", "4"],
            buildDirectoryPath: "/abs/build",
            sdkconfigDefaults: [],
            sdkconfigFilePath: "",
          },
        })
      );
      assert.strictEqual(parameterToProjectConfigMap("idf.buildPath"), "/abs/build");
      assert.deepStrictEqual(parameterToProjectConfigMap("idf.ninjaArgs"), ["-j", "4"]);
    });

    test("maps task names from the active profile", () => {
      seedSelectedProfile(
        minimalProjectConf({
          tasks: {
            preBuild: "task-a",
            postBuild: "task-b",
            preFlash: "task-c",
            postFlash: "task-d",
          },
        })
      );
      assert.strictEqual(parameterToProjectConfigMap("idf.preBuildTask"), "task-a");
      assert.strictEqual(parameterToProjectConfigMap("idf.postBuildTask"), "task-b");
      assert.strictEqual(parameterToProjectConfigMap("idf.preFlashTask"), "task-c");
      assert.strictEqual(parameterToProjectConfigMap("idf.postFlashTask"), "task-d");
    });
  });

  suite("readParameter and injected configuration source", () => {
    test("uses workspace source when project map yields a falsy string", () => {
      seedSelectedProfile(minimalProjectConf());
      setIdfConfigurationSource(
        createFakeIdfSource({
          getValues: { "idf.unmappedSetting": "from-workspace" },
        })
      );
      assert.strictEqual(readParameter("idf.unmappedSetting"), "from-workspace");
    });

    test("prefers truthy project value without calling configuration getScoped", () => {
      seedSelectedProfile(
        minimalProjectConf({
          build: {
            compileArgs: [],
            ninjaArgs: [],
            buildDirectoryPath: "/only-from-project",
            sdkconfigDefaults: [],
            sdkconfigFilePath: "",
          },
        })
      );
      setIdfConfigurationSource(createFakeIdfSource({ throwOnGetScoped: true }));
      assert.strictEqual(readParameter("idf.buildPath"), "/only-from-project");
    });

    test("merges idf.customExtraVars from workspace, profile env, and idfTarget", () => {
      seedSelectedProfile(
        minimalProjectConf({
          env: { FROM_PROF: "p" },
          idfTarget: "esp32c3",
        })
      );
      setIdfConfigurationSource(
        createFakeIdfSource({
          getValues: { "idf.customExtraVars": { FROM_WS: "w" } },
        })
      );
      const merged = parameterToProjectConfigMap("idf.customExtraVars") as Record<
        string,
        string
      >;
      assert.strictEqual(merged.FROM_WS, "w");
      assert.strictEqual(merged.FROM_PROF, "p");
      assert.strictEqual(merged.IDF_TARGET, "esp32c3");
    });
  });

  suite("checkTypeOfConfiguration", () => {
    test("detects array vs object vs primitive default types", () => {
      setIdfConfigurationSource(
        createFakeIdfSource({
          inspectValues: {
            "idf.arr": { defaultValue: ["x"] },
            "idf.obj": { defaultValue: { k: 1 } },
            "idf.str": { defaultValue: "text" },
          },
        })
      );
      assert.strictEqual(checkTypeOfConfiguration("idf.arr"), "array");
      assert.strictEqual(checkTypeOfConfiguration("idf.obj"), "object");
      assert.strictEqual(checkTypeOfConfiguration("idf.str"), "string");
    });
  });

  suite("resolveVariables", () => {
    test("substitutes config:, workspaceFolder, and execPath", () => {
      seedSelectedProfile(
        minimalProjectConf({
          build: {
            compileArgs: [],
            ninjaArgs: [],
            buildDirectoryPath: "/cfg/build",
            sdkconfigDefaults: [],
            sdkconfigFilePath: "",
          },
        })
      );
      setIdfConfigurationSource(createFakeIdfSource({}));
      const folder = vscode.Uri.file("/ws/folder");
      const withConfig = resolveVariables("p ${config:idf.buildPath} end", folder);
      assert.strictEqual(withConfig, "p /cfg/build end");

      const withWs = resolveVariables("here ${workspaceFolder}", folder);
      assert.strictEqual(withWs, "here /ws/folder");

      const withExec = resolveVariables("exe ${execPath}");
      assert.strictEqual(withExec, `exe ${process.execPath}`);
    });

    test("applies comma prefix for config array and string values", () => {
      seedSelectedProfile(
        minimalProjectConf({
          build: {
            compileArgs: [],
            ninjaArgs: ["-v", "-w"],
            buildDirectoryPath: "/b",
            sdkconfigDefaults: [],
            sdkconfigFilePath: "",
          },
        })
      );
      setIdfConfigurationSource(createFakeIdfSource({}));
      const arr = resolveVariables("${config:idf.ninjaArgs,-D}", undefined);
      assert.strictEqual(arr, "-D-v -D-w");

      seedSelectedProfile(
        minimalProjectConf({
          build: {
            compileArgs: [],
            ninjaArgs: [],
            buildDirectoryPath: "/path",
            sdkconfigDefaults: [],
            sdkconfigFilePath: "",
          },
        })
      );
      const str = resolveVariables("${config:idf.buildPath,-C}", undefined);
      assert.strictEqual(str, "-C /path");
    });

    test("resolves env: from custom extra vars, then IDF configuration, then process.env", () => {
      seedSelectedProfile(
        minimalProjectConf({
          env: {},
        })
      );
      setIdfConfigurationSource(
        createFakeIdfSource({
          getValues: {
            "idf.customExtraVars": { FROM_CUSTOM: "custom" },
          },
        })
      );
      assert.strictEqual(
        resolveVariables("${env:FROM_CUSTOM}", undefined),
        "custom"
      );

      ESP.ProjectConfiguration.store.set(
        ESP.ProjectConfiguration.CURRENT_IDF_CONFIGURATION,
        { FROM_IDF_STORE: "idf-store" }
      );
      assert.strictEqual(
        resolveVariables("${env:FROM_IDF_STORE}", undefined),
        "idf-store"
      );

      const pathValue = process.env.PATH ?? process.env.Path;
      if (pathValue !== undefined) {
        const key = process.platform === "win32" ? "Path" : "PATH";
        assert.strictEqual(resolveVariables(`\${env:${key}}`, undefined), pathValue);
      }
    });
  });
});
