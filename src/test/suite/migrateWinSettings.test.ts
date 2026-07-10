/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import * as assert from "assert";
import {
  ConfigurationTarget,
  ExtensionContext,
  WorkspaceConfiguration,
  workspace,
} from "vscode";
import { Logger } from "../../common/logger";
import { createMockMemento } from "../mockUtils";
import {
  isLegacyDefaultValue,
  migrateLegacyWinPortAndBuildPathSettings,
} from "../../configuration/migrateWinSettings";

type InspectResult = {
  defaultValue?: unknown;
  globalValue?: unknown;
  workspaceValue?: unknown;
  workspaceFolderValue?: unknown;
};

type ConfigUpdate = {
  key: string;
  value: unknown;
  target?: ConfigurationTarget;
};

function createMockContext(): ExtensionContext {
  return {
    globalState: createMockMemento(),
  } as ExtensionContext;
}

function createMockConfiguration(
  inspectData: Record<string, InspectResult>,
  updates: ConfigUpdate[]
): WorkspaceConfiguration {
  return {
    inspect: (key: string) => ({ key, ...inspectData[key] }),
    update: async (
      key: string,
      value: unknown,
      target?: ConfigurationTarget
    ) => {
      updates.push({ key, value, target });
      const entry = inspectData[key] ?? (inspectData[key] = {});
      if (target === ConfigurationTarget.Global) {
        if (value === undefined) {
          delete entry.globalValue;
        } else {
          entry.globalValue = value;
        }
      } else if (target === ConfigurationTarget.Workspace) {
        if (value === undefined) {
          delete entry.workspaceValue;
        } else {
          entry.workspaceValue = value;
        }
      } else if (target === ConfigurationTarget.WorkspaceFolder) {
        if (value === undefined) {
          delete entry.workspaceFolderValue;
        } else {
          entry.workspaceFolderValue = value;
        }
      }
    },
    get: () => undefined,
    has: () => false,
  } as unknown as WorkspaceConfiguration;
}

suite("configuration/migrateWinSettings.ts", () => {
  const originalGetConfiguration = workspace.getConfiguration;
  const originalWorkspaceFolders = workspace.workspaceFolders;

  suiteSetup(() => {
    Logger.init({ globalState: createMockMemento() } as ExtensionContext);
  });

  teardown(() => {
    workspace.getConfiguration = originalGetConfiguration;
    Object.defineProperty(workspace, "workspaceFolders", {
      configurable: true,
      get: () => originalWorkspaceFolders,
    });
  });

  suite("isLegacyDefaultValue", () => {
    test("treats idf.portWin detect as default", () => {
      assert.strictEqual(
        isLegacyDefaultValue("idf.portWin", "detect", "detect"),
        true
      );
    });

    test("treats custom idf.portWin as non-default", () => {
      assert.strictEqual(
        isLegacyDefaultValue("idf.portWin", "COM3", "detect"),
        false
      );
    });

    test("treats idf.buildPathWin forward-slash default as default", () => {
      assert.strictEqual(
        isLegacyDefaultValue(
          "idf.buildPathWin",
          "${workspaceFolder}/build",
          "build"
        ),
        true
      );
    });

    test("treats idf.buildPathWin backslash default as default", () => {
      assert.strictEqual(
        isLegacyDefaultValue(
          "idf.buildPathWin",
          "${workspaceFolder}\\build",
          "build"
        ),
        true
      );
    });

    test("treats idf.buildPathWin build as default", () => {
      assert.strictEqual(
        isLegacyDefaultValue("idf.buildPathWin", "build", "build"),
        true
      );
    });

    test("treats custom idf.buildPathWin as non-default", () => {
      assert.strictEqual(
        isLegacyDefaultValue(
          "idf.buildPathWin",
          "${workspaceFolder}/custom",
          "build"
        ),
        false
      );
    });
  });

  suite("migrateLegacyWinPortAndBuildPathSettings", () => {
    test("no-ops on non-Windows platforms", async () => {
      const context = createMockContext();
      const updates: ConfigUpdate[] = [];
      workspace.getConfiguration = () =>
        createMockConfiguration(
          {
            "idf.portWin": { globalValue: "COM3" },
            "idf.port": { defaultValue: "detect" },
          },
          updates
        );

      await migrateLegacyWinPortAndBuildPathSettings(context, {
        platform: "darwin",
      });

      assert.strictEqual(updates.length, 0);
      assert.strictEqual(
        context.globalState.get<boolean>("idf.migratedWinPortBuildPathSettings"),
        undefined
      );
    });

    test("copies custom legacy value when canonical is unset", async () => {
      const context = createMockContext();
      const updates: ConfigUpdate[] = [];
      workspace.getConfiguration = () =>
        createMockConfiguration(
          {
            "idf.portWin": { globalValue: "COM3" },
            "idf.port": { defaultValue: "detect" },
            "idf.buildPathWin": { defaultValue: "build" },
            "idf.buildPath": { defaultValue: "build" },
          },
          updates
        );
      Object.defineProperty(workspace, "workspaceFolders", {
        configurable: true,
        get: () => undefined,
      });

      await migrateLegacyWinPortAndBuildPathSettings(context, {
        platform: "win32",
      });

      assert.deepStrictEqual(updates, [
        {
          key: "idf.port",
          value: "COM3",
          target: ConfigurationTarget.Global,
        },
        {
          key: "idf.portWin",
          value: undefined,
          target: ConfigurationTarget.Global,
        },
      ]);
      assert.strictEqual(
        context.globalState.get<boolean>("idf.migratedWinPortBuildPathSettings"),
        true
      );
    });

    test("removes default legacy value without writing canonical", async () => {
      const context = createMockContext();
      const updates: ConfigUpdate[] = [];
      workspace.getConfiguration = () =>
        createMockConfiguration(
          {
            "idf.portWin": { globalValue: "detect" },
            "idf.port": { defaultValue: "detect" },
            "idf.buildPathWin": {
              globalValue: "${workspaceFolder}\\build",
            },
            "idf.buildPath": { defaultValue: "build" },
          },
          updates
        );
      Object.defineProperty(workspace, "workspaceFolders", {
        configurable: true,
        get: () => undefined,
      });

      await migrateLegacyWinPortAndBuildPathSettings(context, {
        platform: "win32",
      });

      assert.deepStrictEqual(updates, [
        {
          key: "idf.portWin",
          value: undefined,
          target: ConfigurationTarget.Global,
        },
        {
          key: "idf.buildPathWin",
          value: undefined,
          target: ConfigurationTarget.Global,
        },
      ]);
    });

    test("keeps canonical value when both legacy and canonical are set", async () => {
      const context = createMockContext();
      const updates: ConfigUpdate[] = [];
      workspace.getConfiguration = () =>
        createMockConfiguration(
          {
            "idf.portWin": { globalValue: "COM3" },
            "idf.port": { globalValue: "COM5", defaultValue: "detect" },
            "idf.buildPathWin": { defaultValue: "build" },
            "idf.buildPath": { defaultValue: "build" },
          },
          updates
        );
      Object.defineProperty(workspace, "workspaceFolders", {
        configurable: true,
        get: () => undefined,
      });

      await migrateLegacyWinPortAndBuildPathSettings(context, {
        platform: "win32",
      });

      assert.deepStrictEqual(updates, [
        {
          key: "idf.portWin",
          value: undefined,
          target: ConfigurationTarget.Global,
        },
      ]);
    });

    test("no-ops when legacy keys are absent", async () => {
      const context = createMockContext();
      const updates: ConfigUpdate[] = [];
      workspace.getConfiguration = () =>
        createMockConfiguration(
          {
            "idf.port": { defaultValue: "detect" },
            "idf.buildPath": { defaultValue: "build" },
          },
          updates
        );
      Object.defineProperty(workspace, "workspaceFolders", {
        configurable: true,
        get: () => undefined,
      });

      await migrateLegacyWinPortAndBuildPathSettings(context, {
        platform: "win32",
      });

      assert.strictEqual(updates.length, 0);
      assert.strictEqual(
        context.globalState.get<boolean>("idf.migratedWinPortBuildPathSettings"),
        true
      );
    });

    test("does not run twice when migration flag is set", async () => {
      const context = createMockContext();
      await context.globalState.update(
        "idf.migratedWinPortBuildPathSettings",
        true
      );
      const updates: ConfigUpdate[] = [];
      workspace.getConfiguration = () =>
        createMockConfiguration(
          {
            "idf.portWin": { globalValue: "COM3" },
            "idf.port": { defaultValue: "detect" },
            "idf.buildPathWin": { defaultValue: "build" },
            "idf.buildPath": { defaultValue: "build" },
          },
          updates
        );

      await migrateLegacyWinPortAndBuildPathSettings(context, {
        platform: "win32",
      });

      assert.strictEqual(updates.length, 0);
    });
  });
});
