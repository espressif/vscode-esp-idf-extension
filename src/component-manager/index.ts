/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 23rd June 2026 3:03:09 pm
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

import { ExtensionContext, Uri, ViewColumn, workspace, window } from "vscode";
import { ComponentManagerUIPanel } from "./panel";
import { registerIDFCommand } from "../common/registerCommand";
import { ESP } from "../config";

export function registerComponentManagerCmd(context: ExtensionContext) {
  registerIDFCommand(context, "esp.component-manager.ui.show", async () => {
    const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
    ComponentManagerUIPanel.show(context.extensionPath, wsFolder.uri);
  });

  registerIDFCommand(context, "espIdf.openIdfDocument", async (docUri: Uri) => {
    const doc = await workspace.openTextDocument(docUri.fsPath);
    await window.showTextDocument(doc, ViewColumn.One, true);
  });
}
