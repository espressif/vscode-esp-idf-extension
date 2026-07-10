/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import * as assert from "assert";
import { join } from "path";
import * as vscode from "vscode";
import { ESP } from "../../config";
import { Logger } from "../../common/logger";
import { ProjectConfigStore } from "../../project-conf/utils";
import { createMockMemento } from "../mockUtils";
import {
  getWorkspaceFsPathFromScope,
  resolveIdfBuildPathValue,
} from "../../configuration/buildPath";
import { getIdfBuildPath } from "../../configuration/workspace";
import {
  resetIdfConfigurationSource,
  setIdfConfigurationSource,
} from "../../configuration/idfConfigurationSource";
import { IdfConfigurationSource } from "../../configuration/idfConfigurationSource";

function createFakeIdfSource(
  options: {
    getValues?: Record<string, unknown>;
  } = {}
): IdfConfigurationSource {
  const getValues = options.getValues ?? {};
  return {
    getScoped: (_section, _scope, key) => getValues[key],
    inspectGlobal: () => undefined,
    updateScoped: async () => undefined,
    updateGlobal: async () => undefined,
    refreshConfiguration: () => undefined,
  };
}

suite("configuration/buildPath.ts", () => {
  const workspaceFsPath = "/ws/project";

  suite("resolveIdfBuildPathValue", () => {
    test("resolves default relative build directory", () => {
      assert.strictEqual(
        resolveIdfBuildPathValue("build", workspaceFsPath),
        join(workspaceFsPath, "build")
      );
    });

    test("keeps absolute paths unchanged", () => {
      assert.strictEqual(
        resolveIdfBuildPathValue("/abs/build", workspaceFsPath),
        "/abs/build"
      );
    });

    test("falls back to workspace build when setting is empty", () => {
      assert.strictEqual(
        resolveIdfBuildPathValue("", workspaceFsPath),
        join(workspaceFsPath, "build")
      );
    });

    test("resolves nested relative paths", () => {
      assert.strictEqual(
        resolveIdfBuildPathValue("out/build", workspaceFsPath),
        join(workspaceFsPath, "out/build")
      );
    });
  });

  suite("getWorkspaceFsPathFromScope", () => {
    test("reads fsPath from Uri scope", () => {
      assert.strictEqual(
        getWorkspaceFsPathFromScope(vscode.Uri.file("/ws/folder")),
        "/ws/folder"
      );
    });
  });
});

suite("configuration/workspace getIdfBuildPath", () => {
  const mockUpContext: vscode.ExtensionContext = {
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

  test("resolves relative idf.buildPath from configuration source", () => {
    setIdfConfigurationSource(
      createFakeIdfSource({
        getValues: { "idf.buildPath": "build" },
      })
    );
    const folder = vscode.Uri.file("/ws/folder");
    assert.strictEqual(getIdfBuildPath(folder), join("/ws/folder", "build"));
  });
});
