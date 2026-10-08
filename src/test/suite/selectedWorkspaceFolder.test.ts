/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import * as assert from "assert";
import { resolve } from "path";
import {
  ExtensionContext,
  Memento,
  Uri,
  workspace,
  WorkspaceFolder,
} from "vscode";
import { Logger } from "../../common/logger";
import { ExtensionConfigStore } from "../../common/store";
import { createMockMemento } from "../mockUtils";

const SELECTED_WORKSPACE_FOLDER = "SELECTED_WORKSPACE_FOLDER";

function makeFolders(...names: string[]): WorkspaceFolder[] {
  return names.map((name, index) => ({
    name,
    index,
    uri: Uri.file(resolve("/tmp/esp-ws", name)),
  }));
}

function stubWorkspaceFolders(folders: WorkspaceFolder[] | undefined) {
  Object.defineProperty(workspace, "workspaceFolders", {
    configurable: true,
    get: () => folders,
  });
  workspace.getWorkspaceFolder = (uri: Uri) => {
    const target = uri.toString();
    return (folders ?? [])
      .filter((folder) => {
        const base = folder.uri.toString();
        return target === base || target.startsWith(`${base}/`);
      })
      .sort((a, b) => b.uri.toString().length - a.uri.toString().length)[0];
  };
}

suite("common/store.ts selected workspace folder", () => {
  const originalWorkspaceFolders = workspace.workspaceFolders;
  const originalGetWorkspaceFolder = workspace.getWorkspaceFolder;
  let workspaceState: Memento;
  let globalState: Memento;
  let store: ExtensionConfigStore;

  function createStore() {
    workspaceState = createMockMemento();
    globalState = createMockMemento();
    const context = {
      extensionPath: resolve(__dirname, "..", "..", ".."),
      asAbsolutePath: (p: string) => resolve(__dirname, "..", "..", "..", p),
      workspaceState,
      globalState,
    } as ExtensionContext;
    Logger.init(context);
    store = ExtensionConfigStore.resetForTests(context);
  }

  setup(() => {
    createStore();
  });

  teardown(() => {
    Object.defineProperty(workspace, "workspaceFolders", {
      configurable: true,
      get: () => originalWorkspaceFolders,
    });
    workspace.getWorkspaceFolder = originalGetWorkspaceFolder;
  });

  test("init clears the legacy globalState key", () => {
    globalState = createMockMemento();
    globalState.update(SELECTED_WORKSPACE_FOLDER, "file:///legacy");
    const context = {
      workspaceState: createMockMemento(),
      globalState,
    } as ExtensionContext;

    ExtensionConfigStore.resetForTests(context);

    assert.strictEqual(globalState.get(SELECTED_WORKSPACE_FOLDER), undefined);
  });

  test("setSelectedWorkspaceFolder writes to workspaceState only", () => {
    const [root, firmware] = makeFolders("root", "firmware");
    stubWorkspaceFolders([root, firmware]);

    store.setSelectedWorkspaceFolder(firmware.uri);

    assert.strictEqual(
      workspaceState.get(SELECTED_WORKSPACE_FOLDER),
      firmware.uri.toString()
    );
    assert.strictEqual(globalState.get(SELECTED_WORKSPACE_FOLDER), undefined);
    assert.strictEqual(
      store.getSelectedWorkspaceFolderUri(),
      firmware.uri.toString()
    );
  });

  test("findSelectedWorkspaceFolder returns undefined without folders", () => {
    stubWorkspaceFolders(undefined);
    assert.strictEqual(store.findSelectedWorkspaceFolder(), undefined);

    stubWorkspaceFolders([]);
    assert.strictEqual(store.findSelectedWorkspaceFolder(), undefined);
  });

  test("findSelectedWorkspaceFolder defaults to the first folder", () => {
    const folders = makeFolders("root", "client", "firmware");
    stubWorkspaceFolders(folders);

    assert.strictEqual(store.findSelectedWorkspaceFolder(), folders[0]);
    assert.strictEqual(store.getSelectedWorkspaceFolderUri(), "");
  });

  test("findSelectedWorkspaceFolder returns the stored folder", () => {
    const folders = makeFolders("root", "client", "server", "firmware");
    stubWorkspaceFolders(folders);
    store.setSelectedWorkspaceFolder(folders[3].uri);

    assert.strictEqual(store.findSelectedWorkspaceFolder(), folders[3]);
    assert.strictEqual(store.getSelectedWorkspaceFolder(), folders[3]);
  });

  test("stored folder nested inside the root folder resolves to itself", () => {
    const root: WorkspaceFolder = {
      name: "root",
      index: 0,
      uri: Uri.file(resolve("/tmp/esp-ws")),
    };
    const firmware: WorkspaceFolder = {
      name: "firmware",
      index: 1,
      uri: Uri.file(resolve("/tmp/esp-ws/firmware")),
    };
    stubWorkspaceFolders([root, firmware]);
    store.setSelectedWorkspaceFolder(firmware.uri);

    assert.strictEqual(store.findSelectedWorkspaceFolder(), firmware);
  });

  test("falls back to the first folder and clears a stale selection", () => {
    const folders = makeFolders("root", "firmware");
    stubWorkspaceFolders(folders);
    store.setSelectedWorkspaceFolder(
      Uri.file(resolve("/tmp/esp-ws/removed"))
    );

    assert.strictEqual(store.findSelectedWorkspaceFolder(), folders[0]);
    assert.strictEqual(store.getSelectedWorkspaceFolderUri(), "");
  });

  test("falls back to the first folder when the stored value is invalid", () => {
    const folders = makeFolders("root", "firmware");
    stubWorkspaceFolders(folders);
    workspaceState.update(SELECTED_WORKSPACE_FOLDER, "not a uri");
    workspace.getWorkspaceFolder = () => {
      throw new Error("invalid uri");
    };

    assert.strictEqual(store.findSelectedWorkspaceFolder(), folders[0]);
    assert.strictEqual(store.getSelectedWorkspaceFolderUri(), "");
  });

  test("clearSelectedWorkspaceFolder removes the stored value", () => {
    const folders = makeFolders("root", "firmware");
    stubWorkspaceFolders(folders);
    store.setSelectedWorkspaceFolder(folders[1].uri);

    store.clearSelectedWorkspaceFolder();

    assert.strictEqual(store.getSelectedWorkspaceFolderUri(), "");
    assert.strictEqual(store.findSelectedWorkspaceFolder(), folders[0]);
  });

  test("getSelectedWorkspaceFolder throws without folders", () => {
    stubWorkspaceFolders(undefined);

    assert.throws(
      () => store.getSelectedWorkspaceFolder(),
      /No workspace selected/
    );
  });
});
