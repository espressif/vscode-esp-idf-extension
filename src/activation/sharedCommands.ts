/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 12th October 2026
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
import { registerWalkthroughCommands } from "../common/activation";
import { ChangelogViewer } from "../changelog-viewer";
import { registerIDFCommand } from "../common/registerCommand";
import { registerSelectConfTargetCommand } from "../configuration";
import { registerInstallManagerCommand } from "../eim";
import { registerWorkspaceFreeDocsCommands } from "../espIdf/documentation";
import { registerMCPServers } from "../mcp";
import { registerWorkspaceFreeNewProjectCommands } from "../newProject";
import { registerRainMakerCommands } from "../rainmaker";
import { registerDoctorReportCommand } from "../support";
import { registerRemoveEspIdfSettingsCommand } from "../uninstall";
import { registerWelcomePanel } from "../welcome";
import { registerCommandsTree } from "../cmdTreeView/cmdTreeDataProvider";

export interface SharedActivationActions {
  retryActivation: () => Promise<void>;
  selectEimIdfJson: () => Promise<void>;
}

let sharedCommandsRegistered = false;

export function registerSharedCommands(
  context: ExtensionContext,
  actions: SharedActivationActions
) {
  if (sharedCommandsRegistered) {
    return;
  }
  sharedCommandsRegistered = true;
  registerCommandsTree(context);

  registerMCPServers(context);
  registerInstallManagerCommand(context);
  registerWelcomePanel(context);
  registerWorkspaceFreeNewProjectCommands(context);
  registerWalkthroughCommands(context);
  registerRemoveEspIdfSettingsCommand(context);
  registerRainMakerCommands(context);
  registerDoctorReportCommand(context);
  registerWorkspaceFreeDocsCommands(context);
  registerSelectConfTargetCommand(context);
  ChangelogViewer.showChangeLogAndUpdateVersion(context);

  registerIDFCommand(context, "espIdf.selectEimIdfJson", () =>
    actions.selectEimIdfJson()
  );
  registerIDFCommand(context, "espIdf.retryActivation", () =>
    actions.retryActivation()
  );
}
