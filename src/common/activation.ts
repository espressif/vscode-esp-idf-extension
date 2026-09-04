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
  window,
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

export async function checkIfActivateExtension(): Promise<boolean> {
  // Validate workspace activation eligibility
  // See docs_espressif/en/extension-activation.rst for details
  if (PreCheck.isWorkspaceFolderOpen() && workspace.workspaceFolders) {
    const activationModeConfigKey = "idf.extensionActivationMode";
    try {
      const normalizeActivationMode = (
        value: unknown
      ): "detect" | "always" | "never" => {
        if (value === "always") {
          return "always";
        }
        if (value === "never") {
          return "never";
        }
        return "detect";
      };

      // 1) Workspace/global setting: always activates; never suppresses (no prompt).
      const workspaceValue = normalizeActivationMode(
        readParameter(activationModeConfigKey)
      );
      if (workspaceValue === "always") {
        // Activate immediately; skip folder checks and CMake detection.
        Logger.info(
          "Extension activation forced by workspace/global idf.extensionActivationMode=always setting."
        );
        return true;
      } else if (workspaceValue === "never") {
        Logger.info(
          "Extension activation suppressed by workspace/global idf.extensionActivationMode=never setting."
        );
        return false;
      } else {
        // 2) Folder settings: any always activates; only ALL folders never suppresses (no prompt).
        let hasAnyFolderAlways = false;
        let allFoldersNever = workspace.workspaceFolders.length > 0;
        for (const folder of workspace.workspaceFolders) {
          const folderValue = normalizeActivationMode(
            readParameter(activationModeConfigKey, folder.uri)
          );
          if (folderValue === "always") {
            hasAnyFolderAlways = true;
            allFoldersNever = false;
            Logger.info(
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
            Logger.info(
              "Extension activation suppressed because all workspace folders set idf.extensionActivationMode=never."
            );
            return false;
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
                Logger.info(
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
            // 4) Prompt only when no standard project was detected.
            const activateAnyway = await window.showInformationMessage(
              l10n.t(
                "No standard ESP-IDF project was found in this workspace. Do you want to activate the ESP-IDF extension anyway?"
              ),
              { modal: false },
              { title: l10n.t("Activate Anyway") }
            );
            if (
              !activateAnyway ||
              activateAnyway.title !== l10n.t("Activate Anyway")
            ) {
              Logger.info("User chose not to activate the ESP-IDF extension.");
              return false;
            }
            Logger.info(
              "User chose to activate the ESP-IDF extension despite no standard ESP-IDF project was found."
            );
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
  return true;
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

export function registerWalkthroughCommands(context: ExtensionContext) {
  registerIDFCommand(context, "espIdf.openWalkthrough", async () => {
    commands.executeCommand(
      "workbench.action.openWalkthrough",
      "espressif.esp-idf-extension#espIdf.walkthrough.basic-usage"
    );
  });

  const hasWalkthroughBeenShown = readParameter("idf.hasWalkthroughBeenShown");

  if (!hasWalkthroughBeenShown) {
    writeParameter(
      "idf.hasWalkthroughBeenShown",
      true,
      ConfigurationTarget.Global
    );
    commands.executeCommand(
      "workbench.action.openWalkthrough",
      "espressif.esp-idf-extension#espIdf.walkthrough.basic-usage"
    );
  }
}
