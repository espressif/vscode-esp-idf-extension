/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 15th June 2026 3:37:01 pm
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
import { CustomTask, CustomTaskType } from "./customTaskProvider";
import { TaskManager } from "./taskManager";
import { registerIDFCommand } from "../common/registerCommand";
import { openFolderCheck, PreCheck } from "../common/PreCheck";
import { ESP } from "../config";

export function registerCustomTaskCommand(context: ExtensionContext) {
  registerIDFCommand(context, "espIdf.customTask", async () => {
    await PreCheck.perform([openFolderCheck], async () => {
      const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
      const customTask = new CustomTask(wsFolder.uri);
      await customTask.addCustomTask(CustomTaskType.Custom);
      await TaskManager.runTasks();
    });
  });
}
