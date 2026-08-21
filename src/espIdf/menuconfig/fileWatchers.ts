/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 15th June 2026 3:04:24 pm
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

import { ExtensionContext, Uri, workspace } from "vscode";
import { ConfserverProcess } from "./confserver/confServerProcess";
import { statusBarItems } from "../../statusBar";
import { getIdfTargetFromSdkconfig } from "../../configuration/workspace";
import { ESP } from "../../config";

export function addMenuConfigFileWatchers(context: ExtensionContext) {
  const kconfigMenusWatcher = workspace.createFileSystemWatcher(
    "**/config/kconfig_menus.json",
    true,
    false,
    false
  );
  context.subscriptions.push(
    kconfigMenusWatcher.onDidChange(async (e) => {
      if (ConfserverProcess.exists()) {
        ConfserverProcess.dispose();
      }
    }),
    kconfigMenusWatcher.onDidDelete(async (e) => {
      if (ConfserverProcess.exists()) {
        ConfserverProcess.dispose();
      }
    }),
    kconfigMenusWatcher
  );

  const sdkconfigWatcher = workspace.createFileSystemWatcher(
    "**/sdkconfig",
    false,
    false,
    false
  );
  const updateGuiValues = async (e: Uri) => {
    const workspaceFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
    if (workspaceFolder && e.fsPath.includes(workspaceFolder.uri.fsPath)) {
      if (ConfserverProcess.exists() && !ConfserverProcess.isSavedByUI()) {
        ConfserverProcess.loadGuiConfigValues();
      }
      ConfserverProcess.resetSavedByUI();
      await getIdfTargetFromSdkconfig(
        workspaceFolder.uri,
        statusBarItems["target"]
      );
    }
  };
  const sdkCreateWatchDisposable = sdkconfigWatcher.onDidCreate(
    updateGuiValues
  );
  context.subscriptions.push(sdkCreateWatchDisposable);
  const sdkWatchDisposable = sdkconfigWatcher.onDidChange(updateGuiValues);
  context.subscriptions.push(sdkWatchDisposable);
  const sdkDeleteWatchDisposable = sdkconfigWatcher.onDidDelete(
    async (e: Uri) => {
      const workspaceFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
      if (workspaceFolder && e.fsPath.includes(workspaceFolder.uri.fsPath)) {
        ConfserverProcess.dispose();
        await getIdfTargetFromSdkconfig(
          workspaceFolder.uri,
          statusBarItems["target"]
        );
      }
    }
  );
  context.subscriptions.push(sdkDeleteWatchDisposable);
  context.subscriptions.push(sdkconfigWatcher);
}
