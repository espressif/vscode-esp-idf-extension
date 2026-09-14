/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 11th September 2026 4:21:14 pm
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

import { ExtensionContext, workspace } from "vscode";
import { readParameter } from "../configuration/idf";
import { activationModeConfigKey } from "../common/activation";
import {
  registerEspressifMcpServers,
  unregisterEspressifMcpServers,
} from "./espressifMcpServers";

export function registerMCPServers(context: ExtensionContext) {
  if (shouldRegisterEspressifMcpServers()) {
    registerEspressifMcpServers();
  }

  context.subscriptions.push(
    workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration(activationModeConfigKey)) {
        return;
      }
      if (shouldRegisterEspressifMcpServers()) {
        registerEspressifMcpServers();
      } else {
        unregisterEspressifMcpServers();
      }
    })
  );
}

export function shouldRegisterEspressifMcpServers(): boolean {
  const workspaceValue = readParameter(activationModeConfigKey);
  if (workspaceValue === "never") {
    return false;
  }
  if (workspaceValue === "always") {
    return true;
  }
  const folders = workspace.workspaceFolders;
  if (folders && folders.length > 0) {
    const allFoldersNever = folders.every(
      (folder) => readParameter(activationModeConfigKey, folder.uri) === "never"
    );
    if (allFoldersNever) {
      return false;
    }
  }
  return true;
}
