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

import { ExtensionContext, workspace } from "vscode";
import { Logger } from "../common/logger";
import { PreCheck } from "../common/PreCheck";
import { ESP } from "../config";
import { getCurrentIdfConfiguration } from "../configuration/env";
import { getIdfConfigurationSource } from "../configuration/idfConfigurationSource";
import { missingIdfEnvDetail } from "../eim/setupFailureDetail";
import { resolveEimIdfJsonPath } from "../eim/getExistingSetups";
import { registerSelectCurrentIdfVersionCommand } from "../eim";
import { enterConfiguredNoWorkspaceFolder } from "./configuredNoWorkspace";
import { activateConfigured } from "./configured";
import {
  disposeNonConfiguredStatusBar,
  enterNonConfigured,
  enterUndetected,
} from "./nonConfigured";
import { selectEimIdfJsonFile } from "./selectEimIdfJson";
import {
  disposeEimIdfJsonWatcher,
  startEimIdfJsonWatcher,
} from "./eimIdfJsonWatcher";
import { registerSharedCommands } from "./sharedCommands";
import {
  getActivationMode,
  leaveActivation,
  setActivationMode,
} from "./session";
import { requestProjectActivation, runValidations } from "./validate";

let applying = false;
let activationPending = false;
let listenersRegistered = false;
let extensionContext: ExtensionContext | undefined;
let hasLoadedCatalog = false;
let loadedCatalogPath: string | undefined;

async function clearStoredIdfEnv() {
  const store = ESP.ProjectConfiguration.store;
  if (!store) {
    return;
  }
  await Promise.all([
    store.clear(ESP.ProjectConfiguration.CURRENT_IDF_SETUP_ENV),
    store.clear(ESP.ProjectConfiguration.CURRENT_IDF_CONFIGURATION),
  ]);
}

function scheduleActivationAfterDemotion() {
  setTimeout(() => {
    void applyActivation();
  }, 0);
}

function revalidateCatalogPath() {
  getIdfConfigurationSource().refreshConfiguration();
  void revalidateIfLighterMode();
}

function revalidateIfLighterMode() {
  if (applying) {
    return applyActivation();
  }
  // "skipped" and "undetected" stay included so a later idf.extensionActivationMode change can configure an empty setup.
  const activationMode = getActivationMode();
  if (
    activationMode !== "nonConfigured" &&
    activationMode !== "configuredNoWorkspaceFolder" &&
    activationMode !== "skipped" &&
    activationMode !== "undetected"
  ) {
    return;
  }
  return applyActivation();
}

function registerActivationListeners(context: ExtensionContext) {
  if (listenersRegistered) {
    return;
  }
  listenersRegistered = true;
  context.subscriptions.push(
    workspace.onDidChangeWorkspaceFolders(() => {
      void revalidateIfLighterMode();
    }),
    workspace.onDidChangeConfiguration((event) => {
      const catalogPathChanged = event.affectsConfiguration(
        "idf.eimIdfJsonPath"
      );
      if (
        !catalogPathChanged &&
        !event.affectsConfiguration("idf.currentSetup") &&
        !event.affectsConfiguration("idf.extensionActivationMode")
      ) {
        return;
      }
      if (catalogPathChanged) {
        getIdfConfigurationSource().refreshConfiguration();
        setTimeout(revalidateCatalogPath, 0);
        return;
      }
      void revalidateIfLighterMode();
    })
  );
}

async function applyActivation() {
  if (getActivationMode() === "configured" || !extensionContext) {
    return;
  }
  if (applying) {
    activationPending = true;
    return;
  }
  const context = extensionContext;
  applying = true;
  try {
    getIdfConfigurationSource().refreshConfiguration();
    const catalogPathAtStart = await resolveEimIdfJsonPath();
    const catalogChanged =
      hasLoadedCatalog && catalogPathAtStart !== loadedCatalogPath;
    if (catalogChanged) {
      await clearStoredIdfEnv();
    }
    const decision = await runValidations(context.extensionPath);
    if (PreCheck.isWorkspaceFolderOpen()) {
      registerSelectCurrentIdfVersionCommand(context);
    }
    if ((await resolveEimIdfJsonPath()) !== catalogPathAtStart) {
      activationPending = true;
      return;
    }
    hasLoadedCatalog = true;
    loadedCatalogPath = catalogPathAtStart;
    switch (decision.kind) {
      case "nonConfigured":
        enterNonConfigured(decision.failure, decision.detail);
        setActivationMode("nonConfigured");
        break;
      case "configuredNoWorkspaceFolder":
        enterConfiguredNoWorkspaceFolder();
        setActivationMode("configuredNoWorkspaceFolder");
        break;
      case "skipped":
        disposeNonConfiguredStatusBar();
        setActivationMode("skipped");
        break;
      case "undetected":
        enterUndetected();
        setActivationMode("undetected");
        break;
      case "configured": {
        const idfPath = getCurrentIdfConfiguration()["IDF_PATH"];
        if (!idfPath) {
          leaveActivation("invalidCurrentSetup", missingIdfEnvDetail());
          break;
        }
        const activated = await activateConfigured(context);
        if (!activated) {
          break;
        }
        setActivationMode("configured");
        break;
      }
    }
  } finally {
    applying = false;
    if (activationPending) {
      activationPending = false;
      await applyActivation();
    }
  }
}

export async function runActivation(context: ExtensionContext) {
  extensionContext = context;
  registerSharedCommands(context, {
    retryActivation: () => applyActivation(),
    activateAnyway: () => {
      requestProjectActivation();
      return applyActivation();
    },
    selectEimIdfJson: async () => {
      const selected = await selectEimIdfJsonFile();
      if (selected) {
        await applyActivation();
      }
    },
  });
  registerActivationListeners(context);
  try {
    await applyActivation();
  } catch (error) {
    Logger.error("ESP-IDF activation failed.", error as Error, "runActivation");
  }
  await startEimIdfJsonWatcher({
    getMode: () => getActivationMode(),
    isApplying: () => applying,
    leaveForFailure: (failure, detail) => {
      leaveActivation(failure, detail);
      scheduleActivationAfterDemotion();
    },
  });
}

export function disposeActivation() {
  disposeEimIdfJsonWatcher();
  disposeNonConfiguredStatusBar();
}
