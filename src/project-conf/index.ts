/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 17th June 2026 3:09:14 pm
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

import { commands, ExtensionContext, window } from "vscode";
import { registerIDFCommand } from "../common/registerCommand";
import { missingDependency } from "../common/error/knownError";
import { statusBarItems } from "../statusBar";
import { openFolderCheck, PreCheck } from "../common/PreCheck";
import { ProjectConfigurationManager } from "./ProjectConfigurationManager";

export { ProjectConfigStore } from "./store";

export { getProjectConfigurationElements } from "./presetsReader";

export {
  saveProjectConfFile,
  updateCurrentProfileCustomExtraVars,
  updateCurrentProfileIdfTarget,
  updateCurrentProfileOpenOcdConfigs,
  updateCurrentProjectConfiguration,
} from "./presetsWriter";

export {
  getPresetCustomExtraVars,
  getPresetParameterValue,
} from "./presetSettings";

export {
  legacyConfigToConfigurePreset,
  migrateLegacyConfiguration,
} from "./legacy";

export function registerProjectConfigCommands(context: ExtensionContext) {
  registerIDFCommand(
    context,
    "espIdf.rmProjectConfStatusBar",
    async () => {
      if (statusBarItems["projectConf"]) {
        statusBarItems["projectConf"].dispose();
        delete statusBarItems["projectConf"];
      }
    },
    { outputChannel: "Project Configuration" }
  );

  registerIDFCommand(
    context,
    "espIdf.projectConf",
    () => {
      PreCheck.perform([openFolderCheck], async () => {
        if (ProjectConfigurationManager.instance) {
          await ProjectConfigurationManager.instance.selectProjectConfiguration();
        } else {
          throw missingDependency("Project Configuration Manager", {
            userMessage: "Project Configuration Manager is not initialized.",
            logMessage: "Project Configuration Manager not initialized.",
            actions: [
              {
                label: "Reload Window",
                execute: () =>
                  commands.executeCommand("workbench.action.reloadWindow"),
              },
            ],
            outputChannel: "Project Configuration",
          });
        }
      });
    },
    { outputChannel: "Project Configuration" }
  );

  registerIDFCommand(
    context,
    "espIdf.createProjectConfiguration",
    () => {
      PreCheck.perform([openFolderCheck], async () => {
        if (ProjectConfigurationManager.instance) {
          await ProjectConfigurationManager.instance.createProjectConfiguration();
        } else {
          window.showErrorMessage(
            "Project Configuration Manager not initialized."
          );
        }
      });
    },
    { outputChannel: "Project Configuration" }
  );
}
