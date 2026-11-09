/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 23rd June 2026 2:32:43 pm
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

import {
  ExtensionContext,
  workspace,
  l10n,
  commands,
  ConfigurationTarget,
} from "vscode";
import { Logger } from "./logger";
import { PreCheck } from "./PreCheck";
import { readParameter, writeParameter } from "../configuration/idf";
import { getIdfBuildPath } from "../configuration/workspace";
import { join } from "path";
import { pathExists, readFile } from "fs-extra";
import { checkIsProjectCmakeLists } from "../newProject/utils";
import { showInfoNotificationWithAction } from "./customNotifications";
import { registerIDFCommand } from "./registerCommand";

export const activationModeConfigKey = "idf.extensionActivationMode";

export type ProjectActivation = "activate" | "suppress" | "undetected";

export function normalizeActivationMode(
  value: unknown
): "detect" | "always" | "never" {
  if (value === "always") {
    return "always";
  }
  if (value === "never") {
    return "never";
  }
  return "detect";
}

/** Workspace value wins over global. Folder values are ignored. */
export function isWorkspaceOrGlobalActivationNever(
  inspected: { globalValue?: unknown; workspaceValue?: unknown } | undefined
): boolean {
  if (!inspected) {
    return false;
  }
  const value =
    inspected.workspaceValue !== undefined
      ? inspected.workspaceValue
      : inspected.globalValue;
  return value === "never";
}

export async function checkIfActivateExtension(): Promise<ProjectActivation> {
  // Validate workspace activation eligibility
  // See docs_espressif/en/extension-activation.rst for details
  if (PreCheck.isWorkspaceFolderOpen() && workspace.workspaceFolders) {
    const activationModeConfigKey = "idf.extensionActivationMode";
    try {
      // 1) Workspace/global setting: always activates; never suppresses.
      const workspaceValue = normalizeActivationMode(
        readParameter(activationModeConfigKey)
      );
      if (workspaceValue === "always") {
        // Activate immediately; skip folder checks and CMake detection.
        Logger.warn(
          "Extension activation forced by workspace/global idf.extensionActivationMode=always setting."
        );
        return "activate";
      } else if (workspaceValue === "never") {
        Logger.warn(
          "Extension activation suppressed by workspace/global idf.extensionActivationMode=never setting."
        );
        return "suppress";
      } else {
        // 2) Folder settings: any always activates; only ALL folders never suppresses.
        let hasAnyFolderAlways = false;
        let allFoldersNever = workspace.workspaceFolders.length > 0;
        for (const folder of workspace.workspaceFolders) {
          const folderValue = normalizeActivationMode(
            readParameter(activationModeConfigKey, folder.uri)
          );
          if (folderValue === "always") {
            hasAnyFolderAlways = true;
            allFoldersNever = false;
            Logger.warn(
              "Extension activation forced by folder-level idf.extensionActivationMode=always setting."
            );
            break;
          }
          if (folderValue !== "never") {
            allFoldersNever = false;
          }
        }

        if (!hasAnyFolderAlways) {
          if (allFoldersNever) {
            Logger.warn(
              "Extension activation suppressed because all workspace folders set idf.extensionActivationMode=never."
            );
            return "suppress";
          }

          // 3) Fallback: CMakeLists.txt detection across folders.
          let hasCMakeIdfProject = false;
          for (const workspaceFolder of workspace.workspaceFolders) {
            const rootCMakeListsPath = join(
              workspaceFolder.uri.fsPath,
              "CMakeLists.txt"
            );
            const rootCMakeListsExists = await pathExists(rootCMakeListsPath);
            if (!rootCMakeListsExists) {
              continue;
            }
            try {
              const cmakeContent = await readFile(rootCMakeListsPath, "utf-8");
              if (
                cmakeContent.includes(
                  "include($ENV{IDF_PATH}/tools/cmake/project.cmake)"
                )
              ) {
                hasCMakeIdfProject = true;
                Logger.warn(
                  "Extension activated via CMakeLists.txt ESP-IDF project detection."
                );
                break;
              }
            } catch (error) {
              Logger.error(
                `Error reading root CMakeLists.txt for activation check in ${workspaceFolder.name}.`,
                error as Error,
                "activate checkCMakeContent"
              );
            }
          }

          if (!hasCMakeIdfProject) {
            Logger.warn(
              "No standard ESP-IDF project was found in this workspace."
            );
            return "undetected";
          }
        }
      }
    } catch (error) {
      Logger.error(
        "Error checking idf.extensionActivationMode setting for activation.",
        error as Error,
        "activate checkExtensionActivationModeSetting"
      );
    }
  }
  return "activate";
}

export function checkAndNotifyMissingCompileCommands() {
  if (workspace.workspaceFolders) {
    workspace.workspaceFolders.forEach(async (folder) => {
      try {
        const isIdfProject = checkIsProjectCmakeLists(folder.uri.fsPath);
        if (isIdfProject) {
          const buildDirPath = getIdfBuildPath(folder.uri);
          const compileCommandsPath = join(
            buildDirPath,
            "compile_commands.json"
          );
          const compileCommandsExists = await pathExists(compileCommandsPath);

          if (!compileCommandsExists) {
            showInfoNotificationWithAction(
              l10n.t(
                "compile_commands.json is missing. This may cause errors with code analysis extensions."
              ),
              l10n.t("Generate compile_commands.json"),
              () => commands.executeCommand("espIdf.idfReconfigureTask")
            );
          }
        }
      } catch (error) {
        const msg =
          error instanceof Error && error.message
            ? error.message
            : "Error checking for compile_commands.json file.";
        Logger.error(
          msg,
          error as Error,
          "checkAndNotifyMissingCompileCommands",
          undefined,
          false
        );
      }
    });
  }
}

const basicUsageWalkthroughId =
  "espressif.esp-idf-extension#espIdf.walkthrough.basic-usage";

const basicUsageStepIds = [
  "introduction",
  "extension-configuration",
  "create-example-project",
  "setup-project",
  "build-flash-monitor",
  "additional-resources-and-ui",
];

let walkthroughOpenRequested = false;
let extensionConfigurationWalkthroughOpened = false;

async function markBasicUsageStepIncomplete(stepId: string) {
  try {
    await commands.executeCommand(
      "welcome.markStepIncomplete",
      `${basicUsageWalkthroughId}#${stepId}`
    );
  } catch (error) {
    Logger.error(
      `Could not mark walkthrough step ${stepId} incomplete.`,
      error as Error,
      "openBasicUsageWalkthrough"
    );
  }
}

async function markBasicUsageStepsIncomplete() {
  await Promise.all(
    basicUsageStepIds.map((stepId) => markBasicUsageStepIncomplete(stepId))
  );
}

async function openBasicUsageWalkthrough(
  basicUsageStep?: string,
  options?: { resetProgress?: boolean }
) {
  if (options?.resetProgress) {
    await markBasicUsageStepsIncomplete();
  }
  // Opening the walkthrough runs workbench.action.openWalkthrough, which
  // completes additional-resources-and-ui. Clear that step again after.
  if (basicUsageStep) {
    await commands.executeCommand("workbench.action.openWalkthrough", {
      category: basicUsageWalkthroughId,
      step: basicUsageStep,
    });
  } else {
    await commands.executeCommand(
      "workbench.action.openWalkthrough",
      basicUsageWalkthroughId
    );
  }
  await markBasicUsageStepIncomplete("additional-resources-and-ui");
}

export function registerWalkthroughCommands(context: ExtensionContext) {
  registerIDFCommand(context, "espIdf.openWalkthrough", () =>
    openBasicUsageWalkthrough()
  );
}

export function showExtensionConfigurationWalkthrough() {
  if (extensionConfigurationWalkthroughOpened) {
    return;
  }
  extensionConfigurationWalkthroughOpened = true;
  walkthroughOpenRequested = true;
  writeParameter(
    "idf.hasWalkthroughBeenShown",
    true,
    ConfigurationTarget.Global
  );
  void openBasicUsageWalkthrough("extension-configuration", {
    resetProgress: true,
  });
}

export function showWalkthroughOnFirstActivation(basicUsageStep?: string) {
  if (walkthroughOpenRequested) {
    return;
  }
  const hasWalkthroughBeenShown = readParameter("idf.hasWalkthroughBeenShown");
  if (hasWalkthroughBeenShown) {
    walkthroughOpenRequested = true;
    return;
  }
  walkthroughOpenRequested = true;
  writeParameter(
    "idf.hasWalkthroughBeenShown",
    true,
    ConfigurationTarget.Global
  );
  void openBasicUsageWalkthrough(basicUsageStep);
}
