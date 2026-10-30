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

import { l10n, WorkspaceFolder } from "vscode";
import { ESP } from "../config";
import { getIdfSetups } from "./getExistingSetups";
import { IdfSetup } from "./types";
import { getEnvVariables } from "./loadSettings";
import { readParameter } from "../configuration/idf";
import { getVenvPythonBinPath } from "../configuration/env";
import { getEspIdfFromCMake, isBinInPath } from "../utils";
import { join } from "path";
import { isIdfSetupValid, saveSettings } from "./verifySetup";
import { Logger } from "../common/logger";
import { createHash } from "crypto";
import { pathExists } from "fs-extra";
import { IdfToolsManager } from "../idfToolsManager";

export type LoadIdfSetupResult =
  | { ok: true; setup: IdfSetup }
  | { ok: false; detail: string };

export async function getCurrentIdfSetup(
  workspaceFolder?: WorkspaceFolder
): Promise<IdfSetup | undefined> {
  const idfConfigurationName = readParameter(
    "idf.currentSetup",
    workspaceFolder
  ) as string;
  if (!idfConfigurationName) {
    return;
  }
  const idfSetups = await getIdfSetups(workspaceFolder);
  if (!idfSetups || idfSetups.length < 1) {
    return;
  }
  const idfSetupToUse = idfSetups.find((idfSetup) => {
    return idfSetup.idfPath === idfConfigurationName;
  });
  return idfSetupToUse;
}

export async function loadIdfSetup(
  extensionPath: string,
  workspaceFolder: WorkspaceFolder
): Promise<LoadIdfSetupResult> {
  ESP.ProjectConfiguration.store.clear(
    ESP.ProjectConfiguration.CURRENT_IDF_CONFIGURATION
  );
  ESP.ProjectConfiguration.store.clear(
    ESP.ProjectConfiguration.CURRENT_IDF_SETUP_ENV
  );
  const idfEnvSetup = await loadEnvVarsAsIdfSetup(
    extensionPath,
    workspaceFolder
  );
  if (idfEnvSetup && "setup" in idfEnvSetup) {
    Logger.info("Using environment variables to configure extension");
    return { ok: true, setup: idfEnvSetup.setup };
  }
  const envLoadDetail =
    idfEnvSetup && "detail" in idfEnvSetup ? idfEnvSetup.detail : undefined;
  const idfSetups = await getIdfSetups(workspaceFolder);

  if (!idfSetups || idfSetups.length < 1) {
    const detail = envLoadDetail || l10n.t("No ESP-IDF Setups found");
    Logger.error(detail, new Error(detail), "loadIdfSetup", undefined, false);
    return { ok: false, detail };
  }

  let idfSetupToUse: IdfSetup | undefined;
  let loadDetail = envLoadDetail;
  if (idfSetups && idfSetups.length > 0) {
    let idfConfigurationName: string = readParameter(
      "idf.currentSetup",
      workspaceFolder
    ) as string;
    let doesIdfSetupToUseExist = false;
    if (idfConfigurationName) {
      doesIdfSetupToUseExist = await pathExists(idfConfigurationName);
    }
    if (doesIdfSetupToUseExist) {
      idfSetupToUse = idfSetups.find((idfSetup) => {
        return idfSetup.idfPath === idfConfigurationName;
      });
    } else {
      for (const idfSetup of idfSetups) {
        try {
          const envVars = await getEnvVariables(extensionPath, idfSetup);
          const [isValid] = await isIdfSetupValid(extensionPath, envVars);
          if (isValid) {
            idfSetupToUse = idfSetup;
            break;
          }
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Error loading ESP-IDF setup environment";
          loadDetail = message;
          Logger.error(
            message,
            error as Error,
            "loadIdfSetup",
            undefined,
            false
          );
        }
      }
    }
  }

  if (!idfSetupToUse) {
    const detail = loadDetail || l10n.t("Current ESP-IDF setup is not found.");
    Logger.error(detail, new Error(detail), "loadIdfSetup", undefined, false);
    return { ok: false, detail };
  }
  const saved = await saveSettings(
    extensionPath,
    idfSetupToUse,
    workspaceFolder
  );
  if (saved.ok === false) {
    return { ok: false, detail: saved.detail };
  }
  return { ok: true, setup: idfSetupToUse };
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

export async function loadEnvVarsAsIdfSetup(
  extensionPath: string,
  workspaceFolder: WorkspaceFolder
): Promise<{ setup: IdfSetup } | { detail: string } | undefined> {
  const customVarsSetting = readParameter(
    "idf.customExtraVars",
    workspaceFolder
  ) as { [key: string]: string };
  const customVars =
    customVarsSetting !== null &&
    typeof customVarsSetting === "object" &&
    !Array.isArray(customVarsSetting)
      ? { ...customVarsSetting }
      : {};

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

  const normalizedPathName: string =
    Object.keys(process.env).find((k) => k.toUpperCase() == "PATH") || "PATH";
  const pathKeyVariants = Object.keys(customVars).filter(
    (key) => key.toUpperCase() === "PATH" && key !== normalizedPathName
  );
  const existingPathValue = customVars[normalizedPathName];
  const alternatePathValue = pathKeyVariants.find((key) => customVars[key]);
  if (!existingPathValue && alternatePathValue) {
    customVars[normalizedPathName] = customVars[alternatePathValue];
  }
  for (const pathKeyVariant of pathKeyVariants) {
    delete customVars[pathKeyVariant];
  }
  if (!customVars[normalizedPathName]) {
    const idfToolsManager = await IdfToolsManager.createIdfToolsManager(
      extensionPath,
      idfPath
    );
    customVars[
      normalizedPathName
    ] = await idfToolsManager.exportPathsInString(join(idfToolsPath, "tools"), [
      "cmake",
      "ninja",
    ]);
  }
  const envVarsForValidation: { [key: string]: string } = {
    ...customVars,
  };
  // Always include the resolved IDF paths used above
  envVarsForValidation["IDF_PATH"] = idfPath;
  envVarsForValidation["IDF_TOOLS_PATH"] = idfToolsPath;
  // Ensure the normalized PATH key is present
  if (customVars[normalizedPathName]) {
    envVarsForValidation[normalizedPathName] = customVars[normalizedPathName];
  }
  // Optionally include the Python environment path if defined anywhere
  const pythonEnvPath =
    customVars["IDF_PYTHON_ENV_PATH"] || process.env.IDF_PYTHON_ENV_PATH;
  if (pythonEnvPath) {
    envVarsForValidation["IDF_PYTHON_ENV_PATH"] = pythonEnvPath;
  }

  let gitPath = await isBinInPath("git", envVarsForValidation);
  if (!gitPath) {
    gitPath = await isBinInPath("git", process.env);
  }
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
  let venvPythonPath = "";
  if (envVarsForValidation["IDF_PYTHON_ENV_PATH"]) {
    venvPythonPath = getVenvPythonBinPath(
      envVarsForValidation["IDF_PYTHON_ENV_PATH"]
    );
  }

  const [isValid, reason] = await isIdfSetupValid(
    extensionPath,
    envVarsForValidation
  );

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
  const envDefinedIdfSetup: IdfSetup = {
    id: idfSetupId,
    activationScript: "",
    idfPath,
    gitPath,
    toolsPath: idfToolsPath,
    sysPythonPath: "",
    version: envVarsForValidation["ESP_IDF_VERSION"],
    python: venvPythonPath,
    isValid,
  };

  if (isValid) {
    const saved = await saveSettings(
      extensionPath,
      envDefinedIdfSetup,
      workspaceFolder
    );
    if (saved.ok === false) {
      return { detail: saved.detail };
    }
    return { setup: envDefinedIdfSetup };
  }
}

