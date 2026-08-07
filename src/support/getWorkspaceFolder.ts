/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 17th June 2026 3:57:56 pm
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

import { Uri, workspace } from "vscode";
import { ESP } from "../config";
import { ExtensionConfigStore } from "../common/store";

export function getWorkspaceFolder() {
  if (!workspace.workspaceFolders || workspace.workspaceFolders.length === 0) {
    return undefined;
  }
  const fallback = workspace.workspaceFolders[0];
  const storedUri = ESP.GlobalConfiguration.store.get<string>(
    ExtensionConfigStore.SELECTED_WORKSPACE_FOLDER,
    ""
  );
  if (!storedUri) return fallback;
  try {
    const storedFolder = workspace.getWorkspaceFolder(Uri.parse(storedUri));
    if (!storedFolder) {
      return fallback;
    }
    return storedFolder;
  } catch {
    return fallback;
  }
}
