/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 24th February 2023 9:22:15 pm
 * Copyright 2023 Espressif Systems (Shanghai) CO LTD
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

import {
  ExtensionContext,
  TreeItemCheckboxState,
  Uri,
  workspace,
  WorkspaceFolder,
} from "vscode";
import { Logger } from "./logger";

export class ExtensionConfigStore {
  private static self: ExtensionConfigStore;
  private static readonly SELECTED_WORKSPACE_FOLDER =
    "SELECTED_WORKSPACE_FOLDER";
  /** Current key; must stay aligned with `CommandKeys.SelectFlashType` in cmdStore. */
  private static readonly SELECT_FLASH_TYPE_CHECKBOX_KEY =
    "espIdf.selectFlashMethod";
  private ctx: ExtensionContext;

  public static init(context: ExtensionContext): ExtensionConfigStore {
    if (!this.self) {
      this.self = ExtensionConfigStore.create(context);
    }
    return this.self;
  }

  /** @internal Test helper to replace the singleton with a fresh store. */
  public static resetForTests(context: ExtensionContext): ExtensionConfigStore {
    this.self = ExtensionConfigStore.create(context);
    return this.self;
  }

  private static create(context: ExtensionContext): ExtensionConfigStore {
    const store = new ExtensionConfigStore(context);
    store.migrateLegacySelectFlashTypeCheckboxKey();
    store.clear(ExtensionConfigStore.SELECTED_WORKSPACE_FOLDER);
    return store;
  }

  private constructor(context: ExtensionContext) {
    this.ctx = context;
  }

  /**
   * Copies explorer checkbox state from the pre-rename globalState key so existing
   * installs keep visibility preference for "Select Flash Method".
   */
  private migrateLegacySelectFlashTypeCheckboxKey(): void {
    const newKey = ExtensionConfigStore.SELECT_FLASH_TYPE_CHECKBOX_KEY;
    if (this.get<TreeItemCheckboxState>(newKey) !== undefined) {
      return;
    }
    const legacyKey = "espIdf.selectFlashMethodAndFlash";
    const legacyValue = this.get<TreeItemCheckboxState>(legacyKey);
    if (legacyValue === undefined) {
      return;
    }
    this.set(newKey, legacyValue);
    this.clear(legacyKey);
  }

  public get<T>(key: string): T | undefined;
  public get<T>(key: string, defaultValue: T): T;
  public get<T>(key: string, defaultValue?: T): T | undefined {
    if (defaultValue === undefined) {
      return this.ctx.globalState.get<T>(key);
    }
    return this.ctx.globalState.get<T>(key, defaultValue);
  }
  public set(key: string, value: any) {
    this.ctx.globalState.update(key, value);
  }
  public clear(key: string) {
    return this.set(key, undefined);
  }
  public getSelectedWorkspaceFolderUri(): string {
    return this.ctx.workspaceState.get<string>(
      ExtensionConfigStore.SELECTED_WORKSPACE_FOLDER,
      ""
    );
  }
  public findSelectedWorkspaceFolder(): WorkspaceFolder | undefined {
    if (!workspace.workspaceFolders || workspace.workspaceFolders.length === 0) {
      return undefined;
    }
    const fallback = workspace.workspaceFolders[0];
    const storedUri = this.getSelectedWorkspaceFolderUri();
    if (!storedUri) return fallback;
    try {
      const storedFolder = workspace.getWorkspaceFolder(Uri.parse(storedUri));
      if (!storedFolder) {
        this.clearSelectedWorkspaceFolder();
        return fallback;
      }
      return storedFolder;
    } catch {
      this.clearSelectedWorkspaceFolder();
      return fallback;
    }
  }
  public getSelectedWorkspaceFolder(): WorkspaceFolder {
    const selected = this.findSelectedWorkspaceFolder();
    if (!selected) {
      const error = new Error("No workspace selected.");
      Logger.errorNotify(
        error.message,
        error,
        "getSelectedWorkspaceFolder",
        undefined,
        false
      );
      throw error;
    }
    return selected;
  }
  public setSelectedWorkspaceFolder(selectedFolderUri: Uri) {
    this.ctx.workspaceState.update(
      ExtensionConfigStore.SELECTED_WORKSPACE_FOLDER,
      selectedFolderUri.toString()
    );
  }
  public clearSelectedWorkspaceFolder() {
    this.ctx.workspaceState.update(
      ExtensionConfigStore.SELECTED_WORKSPACE_FOLDER,
      undefined
    );
  }
}
