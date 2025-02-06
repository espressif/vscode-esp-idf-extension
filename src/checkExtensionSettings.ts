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
import { Logger } from "./logger/logger";
import { getEspIdfFromCMake } from "./utils";
import { readParameter } from "./idfConfiguration";
import { getSelectedEspIdfSetup } from "./eim/getExistingSetups";
import { checkIdfSetup, saveSettings } from "./eim/verifySetup";
import { IdfSetup } from "./eim/types";
import { join } from "path";
import {
  getIdfMd5sum,
  isCurrentInstallValid,
} from "./eim/checkCurrentSettings";

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
    const espIdeJsonSelected = await getSelectedEspIdfSetup();
    if (espIdeJsonSelected && espIdeJsonSelected.isValid) {
      await saveSettings(
        espIdeJsonSelected,
        vscode.ConfigurationTarget.WorkspaceFolder,
        workspace,
        espIdfStatusBar
      );
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
  const openESPIDfManager = vscode.l10n.t(
    "Open ESP-IDF Installation Manager"
  ) as string;
  const chooseExisting = vscode.l10n.t(
    "Choose from existing ESP-IDF setups."
  ) as string;
  const useDockerConfig = vscode.l10n.t("Use docker container configuration");
  const actionItems = [openESPIDfManager, chooseExisting];
  if (vscode.env.remoteName === "dev-container") {
    actionItems.unshift(useDockerConfig);
  }

  const action = await vscode.window.showInformationMessage(
    vscode.l10n.t(
      "The extension configuration is not valid. Choose an action:"
    ),
    ...actionItems
  );
  if (!action) {
    return;
  }

  if (action === openESPIDfManager) {
    vscode.commands.executeCommand("espIdf.installManager");
    return;
  } else if (action === chooseExisting) {
    vscode.commands.executeCommand("espIdf.selectCurrentIdfVersion");
    return;
  } else if (action === useDockerConfig) {
    const idfPath = "/opt/esp/idf";
    const idfToolsPath = "/opt/esp";
    const gitPath = "/usr/bin/git";
    const idfSetupId = getIdfMd5sum(idfPath);
    const idfVersion = await getEspIdfFromCMake(idfPath);
    const venvPythonPath = join(
      process.env["IDF_PYTHON_ENV_PATH"],
      "bin",
      "python"
    );
    const containerIdfSetup: IdfSetup = {
      id: idfSetupId,
      activationScript: "",
      idfPath,
      gitPath,
      toolsPath: idfToolsPath,
      sysPythonPath: "/usr/bin/python3",
      version: idfVersion,
      python: venvPythonPath,
      isValid: false,
    };
    containerIdfSetup.isValid = await checkIdfSetup(containerIdfSetup);

    if (!containerIdfSetup.isValid) {
      vscode.window.showInformationMessage(
        "The docker container configuration is not valid"
      );
      return;
    }

    await saveSettings(
      containerIdfSetup,
      vscode.ConfigurationTarget.WorkspaceFolder,
      workspace,
      espIdfStatusBar
    );
    return;
  }
}
