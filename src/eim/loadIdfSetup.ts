/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 24th February 2025 5:31:26 pm
 * Copyright 2025 Espressif Systems (Shanghai) CO LTD
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

import { commands, ConfigurationTarget, l10n, Uri, window } from "vscode";
import { ESP } from "../config";
import { getIdfSetups } from "./getExistingSetups";
import { IdfSetup } from "./types";
import { getEnvVariables } from "./loadSettings";
import { readParameter, writeParameter } from "../idfConfiguration";
import { getEspIdfFromCMake } from "../utils";
import { join } from "path";
import { isIdfSetupValid } from "./verifySetup";
import { Logger } from "../logger/logger";
import { createHash } from "crypto";

export async function loadIdfSetup(workspaceFolder: Uri) {
  const idfSetups = await getIdfSetups();

  if (!idfSetups || idfSetups.length < 1) {
    window.showInformationMessage("No ESP-IDF setups found");
    Logger.info("Using loadEnvVarsAsIdfSetup to configure extension");
    const idfEnvSetup = await loadEnvVarsAsIdfSetup(workspaceFolder);
    if (idfEnvSetup) {
      return idfEnvSetup;
    }
  }
  const currentIdfConfigurationName = readParameter(
    "idf.currentSetup",
    workspaceFolder
  ) as string;

  let idfSetupToUse: IdfSetup;
  if (idfSetups.length > 0) {
    if (currentIdfConfigurationName) {
      idfSetupToUse = idfSetups.find((idfSetup) => {
        return idfSetup.idfPath === currentIdfConfigurationName;
      });
    } else {
      const oldIdfPath = readParameter(
        "idf.espIdfPath",
        workspaceFolder
      ) as string;
      if (oldIdfPath) {
        idfSetupToUse = idfSetups.find((idfSetup) => {
          return idfSetup.idfPath === oldIdfPath;
        });
      }
      if (!idfSetupToUse) {
        idfSetupToUse = idfSetups[0];
      }
      await writeParameter(
        "idf.currentSetup",
        idfSetupToUse.idfPath,
        ConfigurationTarget.WorkspaceFolder,
        workspaceFolder
      );
    }
  }

  if (!idfSetupToUse) {
    Logger.infoNotify("Current ESP-IDF setup is not found.");

    const openESPIDFManager = l10n.t(
      "Open ESP-IDF Installation Manager"
    ) as string;
    const action = await window.showInformationMessage(
      l10n.t("The extension configuration is not valid. Choose an action:"),
      openESPIDFManager
    );
    if (!action) {
      return;
    }

    if (action === openESPIDFManager) {
      commands.executeCommand("espIdf.installManager");
      return;
    }
  }

  await writeParameter(
    "idf.gitPath",
    idfSetupToUse.gitPath,
    ConfigurationTarget.Global
  );

  const envVars = await getEnvVariables(idfSetupToUse);

  ESP.ProjectConfiguration.store.set(
    ESP.ProjectConfiguration.CURRENT_IDF_CONFIGURATION,
    envVars
  );
  return idfSetupToUse;
}

function getIdfMd5sum(idfPath: string) {
  if (!idfPath) {
    return "";
  }
  const md5Value = createHash("md5")
    .update(idfPath.replace(/\\/g, "/"))
    .digest("hex");
  return `esp-idf-${md5Value}`;
}

export async function loadEnvVarsAsIdfSetup(workspaceFolder: Uri) {
  const customVars = readParameter("idf.customExtraVars", workspaceFolder) as {
    [key: string]: string;
  };

  const idfPath = process.env.IDF_PATH || customVars["IDF_PATH"];
  const containerPath =
    process.platform === "win32" ? process.env.USERPROFILE : process.env.HOME;
  const defaultIdfToolsPath = join(containerPath, ".espressif");
  const idfToolsPath =
    process.env.IDF_TOOLS_PATH ||
    customVars["IDF_TOOLS_PATH"] ||
    defaultIdfToolsPath;
  const gitPath = "/usr/bin/git";
  const idfSetupId = getIdfMd5sum(idfPath);
  const idfVersion = await getEspIdfFromCMake(idfPath);
  const pyDir =
    process.platform === "win32"
      ? ["Scripts", "python.exe"]
      : ["bin", "python3"];
  let venvPythonPath = "";
  if (process.env.IDF_PYTHON_ENV_PATH || customVars["IDF_PYTHON_ENV_PATH"]) {
    venvPythonPath = join(
      process.env.IDF_PYTHON_ENV_PATH || customVars["IDF_PYTHON_ENV_PATH"],
      ...pyDir
    );
  }
  const envDefinedIdfSetup: IdfSetup = {
    id: idfSetupId,
    activationScript: "",
    idfPath,
    gitPath,
    toolsPath: idfToolsPath,
    sysPythonPath: "",
    version: idfVersion,
    python: venvPythonPath,
    isValid: false,
  };
  envDefinedIdfSetup.isValid = await isIdfSetupValid(envDefinedIdfSetup);

  if (envDefinedIdfSetup.isValid) {
    const envVars = await getEnvVariables(envDefinedIdfSetup);
    ESP.ProjectConfiguration.store.set(
      ESP.ProjectConfiguration.CURRENT_IDF_CONFIGURATION,
      envVars
    );
    return envDefinedIdfSetup;
  }
}
