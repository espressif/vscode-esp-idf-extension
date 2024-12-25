/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Sunday, 10th May 2020 11:33:22 pm
 * Copyright 2020 Espressif Systems (Shanghai) CO LTD
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
import * as vscode from "vscode";
import { isCurrentInstallValid } from "./setup/setupInit";
import { Logger } from "./logger/logger";
import { readParameter } from "./idfConfiguration";
import {
  checkIdfSetup,
  useIdfSetupSettings,
} from "./setup/setupValidation/espIdfSetup";
import { getIdfMd5sum } from "./setup/espIdfJson";
import { getEspIdfFromCMake } from "./utils";
import { IdfSetup } from "./views/setup/types";

export async function checkExtensionSettings(
  workspace: vscode.Uri,
  espIdfStatusBar: vscode.StatusBarItem
) {
  const showWelcomePage = readParameter(
    "idf.showOnboardingOnInit",
    workspace
  ) as boolean;
  try {
    const isExtensionConfigured = await isCurrentInstallValid(workspace);
    if (showWelcomePage && isExtensionConfigured) {
      vscode.commands.executeCommand("espIdf.welcome.start");
      return;
    }
  } catch (error) {
    const msg = error.message
      ? error.message
      : "Checking if current install is valid throws an error.";
    Logger.error(msg, error, "checkExtensionSettings");
  }

  if (!showWelcomePage) {
    return;
  }

  const actionItems = [
    "Open Setup wizard",
    "Choose from existing ESP-IDF setups.",
  ];

  if (vscode.env.remoteName === "dev-container") {
    actionItems.unshift("Use docker container configuration");
  }

  const action = await vscode.window.showInformationMessage(
    "The extension configuration is not valid. Choose an action:",
    ...actionItems
  );
  if (!action) {
    return;
  }

  if (action === "Use docker container configuration") {
    const idfPath = "/opt/esp/idf";
    const idfToolsPath = "/opt/esp";
    const gitPath = "/usr/bin/git";
    const idfSetupId = getIdfMd5sum(idfPath);
    const idfVersion = await getEspIdfFromCMake(idfPath);
    const containerIdfSetup: IdfSetup = {
      id: idfSetupId,
      idfPath,
      gitPath,
      toolsPath: idfToolsPath,
      sysPythonPath: "python",
      version: idfVersion,
      isValid: false,
    };
    containerIdfSetup.isValid = await checkIdfSetup(containerIdfSetup);

    if (!containerIdfSetup.isValid) {
      vscode.window.showInformationMessage(
        "The docker container configuration is not valid"
      );
      return;
    }

    await useIdfSetupSettings(
      containerIdfSetup,
      vscode.ConfigurationTarget.WorkspaceFolder,
      workspace,
      espIdfStatusBar
    );
    return;
  }

  if (action === "Open Setup wizard") {
    vscode.commands.executeCommand("espIdf.setup.start");
    return;
  } else if (action === "Choose from existing ESP-IDF setups.") {
    vscode.commands.executeCommand("espIdf.selectCurrentIdfVersion");
    return;
  }
}
