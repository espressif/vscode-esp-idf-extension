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
  Uri,
  workspace,
  WorkspaceFolder,
} from "vscode";

export class ExtensionConfigStore {
  private static self: ExtensionConfigStore;
  private static readonly SELECTED_WORKSPACE_FOLDER =
    "SELECTED_WORKSPACE_FOLDER";
  private ctx: ExtensionContext;

  public static init(context: ExtensionContext): ExtensionConfigStore {
    if (!this.self) {
      this.self = new ExtensionConfigStore(context);
    }
    return this.self;
  }
  private constructor(context: ExtensionContext) {
    this.ctx = context;
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
  public getSelectedWorkspaceFolder(): WorkspaceFolder | undefined {
    const fallback = workspace.workspaceFolders?.[0];
    const storedUri = this.get<string>(
      ExtensionConfigStore.SELECTED_WORKSPACE_FOLDER,
      ""
    );
    if (!storedUri) return fallback;
    try {
      const storedFolder = workspace.getWorkspaceFolder(Uri.parse(storedUri));
      if (!storedFolder) {
        this.clear(ExtensionConfigStore.SELECTED_WORKSPACE_FOLDER);
        return fallback;
      }
      return storedFolder;
    } catch {
      this.clear(ExtensionConfigStore.SELECTED_WORKSPACE_FOLDER);
      return fallback;
    }
  }
  public setSelectedWorkspaceFolder(selectedFolderUri: Uri) {
    this.set(
      ExtensionConfigStore.SELECTED_WORKSPACE_FOLDER,
      selectedFolderUri.toString()
    );
  }
}
