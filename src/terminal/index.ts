/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 3rd June 2026 3:22:58 pm
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

import {
  ExtensionContext,
  Terminal,
  TerminalLocation,
} from "vscode";
import { registerIDFCommand } from "../common/registerCommand";
import { openFolderCheck, PreCheck } from "../common/PreCheck";
import { noWorkspaceOpen } from "../common/error/knownError";
import { ESP } from "../config";
import { createEspIdfTerminalMain } from "./main";

export function registerIdfTerminalCommand(context: ExtensionContext) {
  registerIDFCommand(
    context,
    "espIdf.createIdfTerminal",
    async () => {
      await PreCheck.perform([openFolderCheck], async () => {
        const workspaceFolder =
          ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
        await createEspIdfTerminalMain(
          workspaceFolder,
          context.extensionPath,
          "ESP-IDF Terminal"
        );
      });
    },
    { outputChannel: "Terminal" }
  );
}

export async function createEspIdfTerminal(
  extensionPath: string,
  terminalName: string,
  initialCommand?: string,
  location?: TerminalLocation
): Promise<Terminal> {
  const workspaceFolder =
    ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
  if (!workspaceFolder) {
    throw noWorkspaceOpen();
  }
  return createEspIdfTerminalMain(
    workspaceFolder,
    extensionPath,
    terminalName,
    initialCommand,
    location
  );
}
