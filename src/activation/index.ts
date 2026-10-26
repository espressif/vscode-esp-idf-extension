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
import { getCurrentIdfConfiguration } from "../configuration/env";
import { missingIdfEnvDetail } from "../eim/setupFailureDetail";
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
      if (
        !event.affectsConfiguration("idf.eimIdfJsonPath") &&
        !event.affectsConfiguration("idf.currentSetup") &&
        !event.affectsConfiguration("idf.extensionActivationMode")
      ) {
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
    const decision = await runValidations(context.extensionPath);
    if (PreCheck.isWorkspaceFolderOpen()) {
      registerSelectCurrentIdfVersionCommand(context);
    }
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
        await activateConfigured(context, idfPath);
        if (getActivationMode() === "nonConfigured") {
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
    },
  });
}

export function disposeActivation() {
  disposeEimIdfJsonWatcher();
  disposeNonConfiguredStatusBar();
}
