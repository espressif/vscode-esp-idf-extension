/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 9th July 2026
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

import { ExtensionContext, WorkspaceFolder } from "vscode";

export type SelectedIdfSetup = {
  idfPath: string;
  id?: string;
  /** Present, including "", when this selection recorded an activation script. */
  activationScript?: string;
};

type SelectedIdfSetupMap = { [folderUri: string]: SelectedIdfSetup };

export class ProjectConfigStore {
  private static self: ProjectConfigStore;
  private static readonly SELECTED_IDF_SETUPS = "SELECTED_IDF_SETUPS";
  private ctx: ExtensionContext;

  public static init(context: ExtensionContext): ProjectConfigStore {
    if (!this.self) {
      this.self = new ProjectConfigStore(context);
    }
    return this.self;
  }

  /** @internal Test helper to replace the singleton with a fresh store. */
  public static resetForTests(context: ExtensionContext): ProjectConfigStore {
    this.self = new ProjectConfigStore(context);
    return this.self;
  }

  private constructor(context: ExtensionContext) {
    this.ctx = context;
  }
  public get<T>(key: string, defaultValue?: T): T {
    return this.ctx.workspaceState.get<T>(key, defaultValue);
  }
  public set(key: string, value: any) {
    this.ctx.workspaceState.update(key, value);
  }
  public clear(key: string) {
    return this.set(key, undefined);
  }

  public getSelectedIdfSetup(
    folder: WorkspaceFolder
  ): SelectedIdfSetup | undefined {
    const map = this.ctx.workspaceState.get<SelectedIdfSetupMap>(
      ProjectConfigStore.SELECTED_IDF_SETUPS,
      {}
    );
    const entry = map[folder.uri.toString()];
    if (!entry || typeof entry.idfPath !== "string" || !entry.idfPath) {
      return undefined;
    }
    const selection: SelectedIdfSetup = { idfPath: entry.idfPath };
    if (entry.id) {
      selection.id = entry.id;
    }
    if (typeof entry.activationScript === "string") {
      selection.activationScript = entry.activationScript;
    }
    return selection;
  }

  public async setSelectedIdfSetup(
    folder: WorkspaceFolder,
    selection: SelectedIdfSetup
  ): Promise<void> {
    if (!selection.idfPath) {
      return;
    }
    const map = {
      ...(this.ctx.workspaceState.get<SelectedIdfSetupMap>(
        ProjectConfigStore.SELECTED_IDF_SETUPS,
        {}
      ) ?? {}),
    };
    const entry: SelectedIdfSetup = { idfPath: selection.idfPath };
    if (selection.id) {
      entry.id = selection.id;
    }
    if (typeof selection.activationScript === "string") {
      entry.activationScript = selection.activationScript;
    }
    map[folder.uri.toString()] = entry;
    await this.ctx.workspaceState.update(
      ProjectConfigStore.SELECTED_IDF_SETUPS,
      map
    );
  }
}
