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

import { ConfigurationTarget, workspace, WorkspaceFolder } from "vscode";
import {
  activationModeConfigKey,
  checkIfActivateExtension,
  isWorkspaceOrGlobalActivationNever,
} from "../common/activation";
import { Logger } from "../common/logger";
import { getStoredIdfSetupEnv } from "../common/prepareEnv";
import { PreCheck } from "../common/PreCheck";
import { ESP } from "../config";
import { getIdfConfigurationSource } from "../configuration/idfConfigurationSource";
import { readParameter, writeParameter } from "../configuration/idf";
import {
  currentSetupRejectDetail,
  finishedIdfInstalls,
  getEimIdfJson,
  noteMissingCustomEimIdfJsonPath,
  unfinishedInstallDetails,
} from "../eim/getExistingSetups";
import { loadEnvVarsAsIdfSetup, loadIdfSetup } from "../eim/loadIdfSetup";
import {
  couldNotSaveCurrentSetupDetail,
  missingIdfEnvDetail,
} from "../eim/setupFailureDetail";
import { EspIdfJson } from "../eim/types";
import { hasRequiredIdfEnv } from "../eim/verifySetup";
import {
  configuredFromEnvVarsDecision,
  customExtraVarsIdfPath,
} from "./customExtraVars";

export type ActivationFailure =
  | "eimJsonMissing"
  | "noFinishedSetup"
  | "invalidCurrentSetup";

export type ActivationDecision =
  | { kind: "nonConfigured"; failure: ActivationFailure; detail?: string }
  | { kind: "configuredNoWorkspaceFolder" }
  | { kind: "skipped" }
  | { kind: "undetected" }
  | { kind: "configured" }
  | { kind: "configuredFromEnvVars" };

/** Consumed once when idf.currentSetup is empty. Does not change idf.extensionActivationMode. */
let forceProjectActivation = false;

export function requestProjectActivation() {
  forceProjectActivation = true;
}

/** Used by unit tests to assert one-shot force activation is consumed. */
export function isForceProjectActivationPending(): boolean {
  return forceProjectActivation;
}

async function resolveEimIdfJson(): Promise<EspIdfJson | undefined> {
  await noteMissingCustomEimIdfJsonPath();
  return getEimIdfJson();
}

async function configureLoadedSetup(
  extensionPath: string,
  workspaceFolder: WorkspaceFolder,
  idfPath: string
): Promise<ActivationDecision> {
  ESP.GlobalConfiguration.store.setSelectedWorkspaceFolder(workspaceFolder.uri);
  let loadDetail: string | undefined;
  const customVars = readParameter("idf.customExtraVars", workspaceFolder);
  try {
    const loaded = await loadIdfSetup(extensionPath, workspaceFolder, {
      skipEnvVars: !!customExtraVarsIdfPath(customVars),
    });
    if (loaded.ok === false) {
      loadDetail = loaded.detail;
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load ESP-IDF setup.";
    Logger.error(
      message,
      error instanceof Error ? error : new Error(message),
      "runValidations",
      undefined,
      false
    );
    return {
      kind: "nonConfigured",
      failure: "invalidCurrentSetup",
      detail: message,
    };
  }
  if (!hasRequiredIdfEnv(getStoredIdfSetupEnv())) {
    const detail = loadDetail || missingIdfEnvDetail();
    Logger.error(detail, new Error(detail), "runValidations", undefined, false);
    return { kind: "nonConfigured", failure: "invalidCurrentSetup", detail };
  }
  Logger.info(`Using finished ESP-IDF setup ${idfPath}.`, "runValidations");
  return { kind: "configured" };
}

async function tryConfigureFromCustomExtraVars(
  extensionPath: string
): Promise<ActivationDecision | undefined> {
  if (!PreCheck.isWorkspaceFolderOpen()) {
    return;
  }
  const workspaceFolder =
    ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder() ||
    workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    return;
  }
  const customVars = readParameter("idf.customExtraVars", workspaceFolder);
  if (!customExtraVarsIdfPath(customVars)) {
    return;
  }
  let loaded: Awaited<ReturnType<typeof loadEnvVarsAsIdfSetup>>;
  try {
    loaded = await loadEnvVarsAsIdfSetup(extensionPath, workspaceFolder, {
      writeCurrentSetup: false,
      notifyOnInvalid: false,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load ESP-IDF setup from idf.customExtraVars.";
    Logger.error(
      message,
      error instanceof Error ? error : new Error(message),
      "runValidations",
      undefined,
      false
    );
    return;
  }
  const decision = configuredFromEnvVarsDecision(
    customVars,
    loaded,
    hasRequiredIdfEnv(getStoredIdfSetupEnv())
  );
  if (!decision || !loaded || !("setup" in loaded)) {
    return;
  }
  ESP.GlobalConfiguration.store.setSelectedWorkspaceFolder(workspaceFolder.uri);
  Logger.info(
    `Using idf.customExtraVars ESP-IDF setup ${loaded.setup.idfPath}.`,
    "runValidations"
  );
  return decision;
}

export async function runValidations(
  extensionPath: string
): Promise<ActivationDecision> {
  const optedIn = forceProjectActivation;
  forceProjectActivation = false;

  if (
    isWorkspaceOrGlobalActivationNever(
      getIdfConfigurationSource().inspectGlobal(activationModeConfigKey)
    )
  ) {
    Logger.info(
      "Extension activation suppressed by workspace/global idf.extensionActivationMode=never before catalog validation.",
      "runValidations"
    );
    return { kind: "skipped" };
  }

  const fromCustomExtraVars = await tryConfigureFromCustomExtraVars(
    extensionPath
  );
  if (fromCustomExtraVars) {
    return fromCustomExtraVars;
  }

  const espIdfJson = await resolveEimIdfJson();
  if (!espIdfJson) {
    const message = "eim_idf.json was not found.";
    Logger.error(
      message,
      new Error(message),
      "runValidations",
      undefined,
      false
    );
    return { kind: "nonConfigured", failure: "eimJsonMissing" };
  }

  const finishedInstalls = await finishedIdfInstalls(espIdfJson);
  if (!finishedInstalls.length) {
    const message = "eim_idf.json has no finished ESP-IDF setup.";
    Logger.error(
      message,
      new Error(message),
      "runValidations",
      undefined,
      false
    );
    return {
      kind: "nonConfigured",
      failure: "noFinishedSetup",
      detail: await unfinishedInstallDetails(espIdfJson),
    };
  }

  if (!PreCheck.isWorkspaceFolderOpen()) {
    Logger.info(
      "ESP-IDF catalog is valid and no workspace folder is open.",
      "runValidations"
    );
    return { kind: "configuredNoWorkspaceFolder" };
  }

  const workspaceFolder =
    ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder() ||
    workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    return { kind: "configuredNoWorkspaceFolder" };
  }
  const currentSetup = readParameter(
    "idf.currentSetup",
    workspaceFolder
  ) as string;
  if (!currentSetup) {
    const projectActivation = optedIn
      ? "activate"
      : await checkIfActivateExtension();
    if (projectActivation === "suppress") {
      Logger.info(
        "idf.currentSetup is empty and the project activation check declined.",
        "runValidations"
      );
      return { kind: "skipped" };
    }
    if (projectActivation === "undetected") {
      Logger.info(
        "No standard ESP-IDF project was found. Waiting for explicit activation.",
        "runValidations"
      );
      return { kind: "undetected" };
    }
    if (optedIn) {
      Logger.info(
        "User chose to activate the ESP-IDF extension without a detected ESP-IDF project.",
        "runValidations"
      );
    }
    const written = await writeParameter(
      "idf.currentSetup",
      finishedInstalls[0].path,
      ConfigurationTarget.WorkspaceFolder,
      workspaceFolder
    );
    if (!written) {
      const message = "Could not save idf.currentSetup.";
      Logger.error(
        message,
        new Error(message),
        "runValidations",
        undefined,
        false
      );
      return {
        kind: "nonConfigured",
        failure: "invalidCurrentSetup",
        detail: couldNotSaveCurrentSetupDetail(),
      };
    }
    Logger.info(
      `Selected ESP-IDF setup ${finishedInstalls[0].path} for ${workspaceFolder.uri.fsPath}.`,
      "runValidations"
    );
    return configureLoadedSetup(
      extensionPath,
      workspaceFolder,
      finishedInstalls[0].path
    );
  }

  const matchingInstall = finishedInstalls.find(
    (install) => install.path === currentSetup
  );
  if (!matchingInstall) {
    const message = `idf.currentSetup ${currentSetup} is not a finished ESP-IDF setup.`;
    Logger.error(
      message,
      new Error(message),
      "runValidations",
      undefined,
      false
    );
    return {
      kind: "nonConfigured",
      failure: "invalidCurrentSetup",
      detail: await currentSetupRejectDetail(espIdfJson, currentSetup),
    };
  }

  return configureLoadedSetup(
    extensionPath,
    workspaceFolder,
    matchingInstall.path
  );
}
