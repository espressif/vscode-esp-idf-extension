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
import { getEspIdfFromCMake, isBinInPath } from "../utils";
import { join } from "path";
import { isIdfSetupValid } from "./verifySetup";
import { Logger } from "../logger/logger";
import { createHash } from "crypto";
import { pathExists } from "fs-extra";
import { IdfToolsManager } from "../idfToolsManager";

export async function loadIdfSetup(workspaceFolder: Uri) {
  const idfEnvSetup = await loadEnvVarsAsIdfSetup(workspaceFolder);
  if (idfEnvSetup) {
    Logger.info("Using environment variables to configure extension");
    return idfEnvSetup;
  }
  const idfSetups = await getIdfSetups(workspaceFolder);

  if (!idfSetups || idfSetups.length < 1) {
    window.showInformationMessage(l10n.t("No ESP-IDF Setups found"));
    void promptOpenEspIdfInstallationManager();
    return;
  }

  let idfSetupToUse: IdfSetup | undefined;
  if (idfSetups && idfSetups.length > 0) {
    let idfConfigurationName: string = readParameter(
      "idf.currentSetup",
      workspaceFolder
    ) as string;
    const doesIdfSetupToUseExist = await pathExists(idfConfigurationName);
    if (doesIdfSetupToUseExist) {
      idfSetupToUse = idfSetups.find((idfSetup) => {
        return idfSetup.idfPath === idfConfigurationName;
      });
    } else {
      for (const idfSetup of idfSetups) {
        const envVars = await getEnvVariables(idfSetup);
        const [isValid] = await isIdfSetupValid(envVars);
        if (isValid) {
          idfSetupToUse = idfSetup;
          break;
        }
      }
    }
  }

  if (!idfSetupToUse) {
    Logger.infoNotify("Current ESP-IDF setup is not found.");
    // Do not await here: activation must continue to register the command first.
    void promptOpenEspIdfInstallationManager();
    return;
  }

  await writeParameter(
    "idf.currentSetup",
    idfSetupToUse.idfPath,
    ConfigurationTarget.WorkspaceFolder,
    workspaceFolder
  );

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

  const idfPath = customVars["IDF_PATH"] || process.env.IDF_PATH || "";
  const idfPathExists = await pathExists(idfPath);
  if (!idfPathExists) {
    return;
  }
  const idfSetupId = getIdfMd5sum(idfPath);
  customVars["ESP_IDF_VERSION"] = await getEspIdfFromCMake(idfPath);

  const containerPath =
    (process.platform === "win32"
      ? process.env.USERPROFILE
      : process.env.HOME) || "";
  const defaultIdfToolsPath = join(containerPath, ".espressif");
  const idfToolsPath =
    customVars["IDF_TOOLS_PATH"] ||
    process.env.IDF_TOOLS_PATH ||
    defaultIdfToolsPath;
  const idfToolsPathExists = await pathExists(idfToolsPath);
  if (!idfToolsPathExists) {
    return;
  }

  const pathNameInEnv: string = Object.keys(process.env).find(
    (k) => k.toUpperCase() == "PATH"
  );
  if (pathNameInEnv && !customVars[pathNameInEnv]) {
    const idfToolsManager = await IdfToolsManager.createIdfToolsManager(
      idfPath
    );
    customVars[pathNameInEnv] = await idfToolsManager.exportPathsInString(
      join(idfToolsPath, "tools"),
      ["cmake", "ninja"]
    );
  }
  const [isValid, reason] = await isIdfSetupValid(customVars);

  if (!isValid) {
    Logger.infoNotify(
      l10n.t(
        "ESP-IDF Setup from environment variables is not valid: {0}",
        reason
      ),
      {
        category: "espIdf.installManager",
        reason,
      }
    );
    return;
  }

  const gitPath = await isBinInPath("git", process.env);
  if (!gitPath) {
    Logger.infoNotify(
      l10n.t(
        "ESP-IDF Setup from environment variables is not valid: {0}",
        "Git not found in PATH"
      ),
      {
        category: "espIdf.installManager",
        reason: "Git not found in PATH",
      }
    );
    return;
  }
  const pyDir =
    process.platform === "win32"
      ? ["Scripts", "python.exe"]
      : ["bin", "python3"];
  let venvPythonPath = "";
  if (customVars["IDF_PYTHON_ENV_PATH"] || process.env.IDF_PYTHON_ENV_PATH) {
    venvPythonPath = join(
      customVars["IDF_PYTHON_ENV_PATH"] || process.env.IDF_PYTHON_ENV_PATH,
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
    version: customVars["ESP_IDF_VERSION"],
    python: venvPythonPath,
    isValid,
  };

  if (isValid) {
    ESP.ProjectConfiguration.store.set(
      ESP.ProjectConfiguration.CURRENT_IDF_CONFIGURATION,
      customVars
    );
    await writeParameter(
      "idf.currentSetup",
      envDefinedIdfSetup.idfPath,
      ConfigurationTarget.WorkspaceFolder,
      workspaceFolder
    );
    return envDefinedIdfSetup;
  }
}

async function promptOpenEspIdfInstallationManager(): Promise<void> {
  const openESPIDFManager = l10n.t(
    "Open ESP-IDF Installation Manager"
  ) as string;
  const action = await window.showInformationMessage(
    l10n.t("The extension configuration is not valid. Choose an action:"),
    openESPIDFManager
  );
  if (action && action === openESPIDFManager) {
    await commands.executeCommand("espIdf.installManager");
  }
}
