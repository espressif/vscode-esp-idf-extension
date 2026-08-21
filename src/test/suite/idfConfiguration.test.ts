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
import {
  ConfigurePreset,
  ESPIDFSettings,
} from "../../project-conf/projectConfiguration";
import { createMockMemento } from "../mockUtils";
import {
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

type MinimalPresetOverrides = {
  binaryDir?: string;
  ninjaArgs?: string[];
  environment?: { [key: string]: string };
  idfTarget?: string;
  tasks?: {
    preBuild?: string;
    postBuild?: string;
    preFlash?: string;
    postFlash?: string;
  };
};

function minimalConfigurePreset(
  overrides: MinimalPresetOverrides = {}
): ConfigurePreset {
  const settings: ESPIDFSettings[] = [];
  if (overrides.ninjaArgs) {
    settings.push({ type: "ninjaArgs", value: overrides.ninjaArgs });
  }
  if (overrides.tasks) {
    settings.push({ type: "tasks", value: overrides.tasks });
  }

  const preset: ConfigurePreset = {
    name: PROFILE,
    binaryDir: overrides.binaryDir ?? "",
    cacheVariables: {
      IDF_TARGET: overrides.idfTarget ?? "esp32",
    },
    environment: overrides.environment ?? {},
  };

  if (settings.length) {
    preset.vendor = {
      [ESP.CMakePresets.ESP_IDF_VENDOR_KEY]: {
        schemaVersion: 1,
        settings,
      },
    };
  }

  return preset;
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
    ESP.ProjectConfiguration.store = ProjectConfigStore.resetForTests(mockUpContext);
    resetIdfConfigurationSource();
  });

  teardown(() => {
    ESP.ProjectConfiguration.store?.clear(
      ESP.ProjectConfiguration.SELECTED_CONFIG
    );
    resetIdfConfigurationSource();
  });

  function seedSelectedProfile(conf: ConfigurePreset) {
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
        minimalConfigurePreset({
          binaryDir: "/abs/build",
          ninjaArgs: ["-j", "4"],
        })
      );
      assert.strictEqual(parameterToProjectConfigMap("idf.buildPath"), "/abs/build");
      assert.deepStrictEqual(parameterToProjectConfigMap("idf.ninjaArgs"), ["-j", "4"]);
    });

    test("maps task names from the active profile", () => {
      seedSelectedProfile(
        minimalConfigurePreset({
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
      seedSelectedProfile(minimalConfigurePreset());
      setIdfConfigurationSource(
        createFakeIdfSource({
          getValues: { "idf.unmappedSetting": "from-workspace" },
        })
      );
      assert.strictEqual(readParameter("idf.unmappedSetting"), "from-workspace");
    });

    test("prefers truthy project value without calling configuration getScoped", () => {
      seedSelectedProfile(
        minimalConfigurePreset({
          binaryDir: "/only-from-project",
        })
      );
      setIdfConfigurationSource(createFakeIdfSource({ throwOnGetScoped: true }));
      assert.strictEqual(readParameter("idf.buildPath"), "/only-from-project");
    });

    test("merges idf.customExtraVars from workspace, profile env, and idfTarget", () => {
      seedSelectedProfile(
        minimalConfigurePreset({
          environment: { FROM_PROF: "p" },
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
        minimalConfigurePreset({
          binaryDir: "/cfg/build",
        })
      );
      setIdfConfigurationSource(createFakeIdfSource({}));
      const folder = vscode.Uri.file("/ws/folder");
      const withConfig = resolveVariables("p ${config:idf.buildPath} end", folder);
      assert.strictEqual(withConfig, "p /cfg/build end");

      seedSelectedProfile(
        minimalConfigurePreset({
          binaryDir: "build",
        })
      );
      const withRelativeBuild = resolveVariables(
        "p ${config:idf.buildPath} end",
        folder
      );
      assert.strictEqual(withRelativeBuild, "p /ws/folder/build end");

      const withWs = resolveVariables("here ${workspaceFolder}", folder);
      assert.strictEqual(withWs, "here /ws/folder");

      const withExec = resolveVariables("exe ${execPath}");
      assert.strictEqual(withExec, `exe ${process.execPath}`);
    });

    test("applies comma prefix for config array and string values", () => {
      seedSelectedProfile(
        minimalConfigurePreset({
          binaryDir: "/b",
          ninjaArgs: ["-v", "-w"],
        })
      );
      setIdfConfigurationSource(createFakeIdfSource({}));
      const arr = resolveVariables("${config:idf.ninjaArgs,-D}", undefined);
      assert.strictEqual(arr, "-D-v -D-w");

      seedSelectedProfile(
        minimalConfigurePreset({
          binaryDir: "/path",
        })
      );
      const str = resolveVariables("${config:idf.buildPath,-C}", undefined);
      assert.strictEqual(str, "-C /path");
    });

    test("resolves env: from custom extra vars, then IDF configuration, then process.env", () => {
      seedSelectedProfile(
        minimalConfigurePreset({
          environment: {},
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
