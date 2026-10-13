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
import { registerSelectCurrentIdfVersionCommand } from "../eim";
import {
  IdfCommandTreeMode,
  setCommandsTreeMode,
} from "../cmdTreeView/cmdTreeDataProvider";
import { enterConfiguredNoWorkspaceFolder } from "./configuredNoWorkspace";
import { activateConfigured } from "./configured";
import {
  disposeNonConfiguredStatusBar,
  enterNonConfigured,
} from "./nonConfigured";
import { selectEimIdfJsonFile } from "./selectEimIdfJson";
import {
  disposeEimIdfJsonWatcher,
  startEimIdfJsonWatcher,
} from "./eimIdfJsonWatcher";
import { registerSharedCommands } from "./sharedCommands";
import { ActivationFailure, runValidations } from "./validate";

type ActivationMode = IdfCommandTreeMode;

let activationMode: ActivationMode = "pending";
let applying = false;
let activationPending = false;
let listenersRegistered = false;
let extensionContext: ExtensionContext | undefined;

function revalidateIfLighterMode() {
  if (applying) {
    return applyActivation();
  }
  // "skipped" stays included so a later idf.extensionActivationMode change can configure an empty setup.
  if (
    activationMode !== "nonConfigured" &&
    activationMode !== "configuredNoWorkspaceFolder" &&
    activationMode !== "skipped"
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
  if (activationMode === "configured" || !extensionContext) {
    return;
  }
  if (applying) {
    activationPending = true;
    return;
  }
  const context = extensionContext;
  applying = true;
  try {
    const decision = await runValidations();
    if (PreCheck.isWorkspaceFolderOpen()) {
      registerSelectCurrentIdfVersionCommand(context);
    }
    switch (decision.kind) {
      case "nonConfigured":
        enterNonConfigured(decision.failure);
        activationMode = "nonConfigured";
        break;
      case "configuredNoWorkspaceFolder":
        enterConfiguredNoWorkspaceFolder();
        activationMode = "configuredNoWorkspaceFolder";
        break;
      case "skipped":
        disposeNonConfiguredStatusBar();
        activationMode = "skipped";
        break;
      case "configured":
        disposeNonConfiguredStatusBar();
        await activateConfigured(context);
        activationMode = "configured";
        break;
    }
    setCommandsTreeMode(activationMode);
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
    getMode: () => activationMode,
    isApplying: () => applying,
    leaveForFailure: (failure: ActivationFailure) => {
      enterNonConfigured(failure);
      activationMode = "nonConfigured";
      setCommandsTreeMode(activationMode);
    },
  });
}

export function disposeActivation() {
  disposeEimIdfJsonWatcher();
  disposeNonConfiguredStatusBar();
}
