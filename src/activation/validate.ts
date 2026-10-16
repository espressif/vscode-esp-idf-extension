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

import { pathExists } from "fs-extra";
import { ConfigurationTarget, workspace } from "vscode";
import { checkIfActivateExtension } from "../common/activation";
import { Logger } from "../common/logger";
import { PreCheck } from "../common/PreCheck";
import { ESP } from "../config";
import { readParameter, writeParameter } from "../configuration/idf";
import {
  defaultEimIdfJsonPath,
  finishedIdfInstalls,
  getEimIdfJson,
} from "../eim/getExistingSetups";
import { EspIdfJson } from "../eim/types";

export type ActivationFailure =
  | "eimJsonMissing"
  | "noFinishedSetup"
  | "invalidCurrentSetup";

export type ActivationDecision =
  | { kind: "nonConfigured"; failure: ActivationFailure }
  | { kind: "configuredNoWorkspaceFolder" }
  | { kind: "skipped" }
  | { kind: "undetected" }
  | { kind: "configured" };

/** Consumed once when idf.currentSetup is empty. Does not change idf.extensionActivationMode. */
let forceProjectActivation = false;

export function requestProjectActivation() {
  forceProjectActivation = true;
}

async function resolveEimIdfJson(): Promise<EspIdfJson | undefined> {
  const customPath = readParameter("idf.eimIdfJsonPath") as string;
  const customFileExists = !!customPath && (await pathExists(customPath));
  if (!customFileExists) {
    const defaultFileExists = await pathExists(defaultEimIdfJsonPath());
    if (!defaultFileExists) {
      return;
    }
    if (customPath) {
      await writeParameter(
        "idf.eimIdfJsonPath",
        "",
        ConfigurationTarget.Global
      );
    }
  }
  return getEimIdfJson();
}

export async function runValidations(): Promise<ActivationDecision> {
  const espIdfJson = await resolveEimIdfJson();
  if (!espIdfJson) {
    Logger.info("eim_idf.json was not found.", "runValidations");
    return { kind: "nonConfigured", failure: "eimJsonMissing" };
  }

  const finishedInstalls = finishedIdfInstalls(espIdfJson);
  if (!finishedInstalls.length) {
    Logger.info(
      "eim_idf.json has no finished ESP-IDF setup.",
      "runValidations"
    );
    return { kind: "nonConfigured", failure: "noFinishedSetup" };
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
    const optedIn = forceProjectActivation;
    forceProjectActivation = false;
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
      Logger.info("Could not save idf.currentSetup.", "runValidations");
      return { kind: "nonConfigured", failure: "invalidCurrentSetup" };
    }
    Logger.info(
      `Selected ESP-IDF setup ${finishedInstalls[0].path} for ${workspaceFolder.uri.fsPath}.`,
      "runValidations"
    );
    return { kind: "configured" };
  }

  const matchingInstall = finishedInstalls.find(
    (install) => install.path === currentSetup
  );
  if (!matchingInstall) {
    Logger.info(
      `idf.currentSetup ${currentSetup} is not a finished ESP-IDF setup.`,
      "runValidations"
    );
    return { kind: "nonConfigured", failure: "invalidCurrentSetup" };
  }

  Logger.info(
    `Using finished ESP-IDF setup ${matchingInstall.path}.`,
    "runValidations"
  );
  return { kind: "configured" };
}
