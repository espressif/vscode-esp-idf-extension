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

import { ExtensionContext } from "vscode";
import { registerIDFCommand } from "../common/registerCommand";
import { missingDependency } from "../common/error/knownError";
import { statusBarItems } from "../statusBar";
import { projectConfigurationPanel } from "./projectConfPanel";
import { openFolderCheck, PreCheck } from "../common/PreCheck";
import { withProgressWrapper } from "../common/withProgressWrapper";
import { ESP } from "../config";
import { getTargetsFromEspIdf } from "../espIdf/setTarget/getTargets";
import { ProjectConfigurationManager } from "./ProjectConfigurationManager";
import { projectConfCommandErrorMapping } from "./errorMapping";

export function registerProjectConfigCommands(context: ExtensionContext) {
  registerIDFCommand(context, "espIdf.rmProjectConfStatusBar", async () => {
    if (statusBarItems["projectConf"]) {
      statusBarItems["projectConf"].dispose();
      delete statusBarItems["projectConf"];
    }
  });

  registerIDFCommand(
    context,
    "espIdf.projectConfigurationEditor",
    async () => {
      await withProgressWrapper(
        [openFolderCheck],
        "ESP-IDF: Loading project configuration",
        async (_progress, _cancelToken) => {
          const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
          const targetsFromIdf = await getTargetsFromEspIdf(wsFolder.uri);
          projectConfigurationPanel.createOrShow(
            context.extensionPath,
            wsFolder.uri,
            targetsFromIdf
          );
        }
      );
    },
    projectConfCommandErrorMapping
  );

  registerIDFCommand(
    context,
    "espIdf.projectConf",
    () => {
      return PreCheck.perform([openFolderCheck], async () => {
        if (ProjectConfigurationManager.instance) {
          await ProjectConfigurationManager.instance.selectProjectConfiguration();
        } else {
          throw missingDependency("Project Configuration Manager");
        }
      });
    },
    projectConfCommandErrorMapping
  );
}
