/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 23rd June 2026 12:47:17 pm
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

import { ExtensionContext } from "vscode";
import { registerIDFCommand } from "./registerCommand";
import { Logger } from "./logger";
import {
  getIdfTargetFromSdkconfig,
  getProjectName,
} from "../configuration/workspace";
import { openFolderCheck, PreCheck } from "./PreCheck";
import { getToolchainPath } from "../utils";
import { ESP } from "../config";

export function registerTaskCommands(context: ExtensionContext) {
  registerIDFCommand(context, "espIdf.getProjectName", () => {
    return PreCheck.perform([openFolderCheck], async () => {
      try {
        const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
        return await getProjectName(wsFolder.uri);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        Logger.errorNotify(errMsg, error as Error, "extension getProjectName");
      }
    });
  });

  registerIDFCommand(context, "espIdf.getToolchainGdb", () => {
    return PreCheck.perform([openFolderCheck], async () => {
      const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
      return await getToolchainPath(wsFolder.uri, "gdb");
    });
  });

  registerIDFCommand(context, "espIdf.getToolchainGcc", () => {
    return PreCheck.perform([openFolderCheck], async () => {
      const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
      return await getToolchainPath(wsFolder.uri, "gcc");
    });
  });

  registerIDFCommand(context, "espIdf.getExtensionPath", () => {
    return context.extensionPath;
  });

  registerIDFCommand(context, "espIdf.getIDFTarget", async () => {
    const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
    return await getIdfTargetFromSdkconfig(wsFolder.uri);
  });
}
