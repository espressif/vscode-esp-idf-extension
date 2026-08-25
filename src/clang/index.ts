/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 27th March 2025 3:04:59 pm
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

import { ExtensionContext, l10n, Uri, workspace, window } from "vscode";
import { isBinInPath } from "../utils";
import { pathExists, writeJSON, writeFile } from "fs-extra";
import { getIdfBuildPath } from "../configuration/workspace";
import { join } from "path";
import { Logger } from "../common/logger";
import { parse } from "jsonc-parser";
import { EOL } from "os";
import { registerIDFCommand } from "../common/registerCommand";
import { openFolderCheck, PreCheck } from "../common/PreCheck";
import { idfToolNotFound, parseError } from "../common/error/knownError";
import { ESP } from "../config";
import { getCurrentIdfConfiguration } from "../configuration/env";

export function registerClangCommands(context: ExtensionContext) {
  registerIDFCommand(context, "espIdf.setClangSettings", async () => {
    await PreCheck.perform([openFolderCheck], async () => {
      const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
      await configureClangSettings(wsFolder.uri, true);
      window.showInformationMessage(
        l10n.t("ESP-IDF: Clang settings have been configured for the project.")
      );
    });
  });
}

export async function validateEspClangExists() {
  const modifiedEnv = getCurrentIdfConfiguration();

  const espClangdPath = await isBinInPath("clangd", modifiedEnv, ["esp-clang"]);
  if (espClangdPath && espClangdPath.includes("esp-clang")) {
    return espClangdPath;
  }
  return "";
}

export async function setClangSettings(
  settingsJson: any,
  workspaceFolder: Uri,
  showError = false
) {
  const espClangPath = await validateEspClangExists();
  if (!espClangPath) {
    if (showError) {
      throw idfToolNotFound("esp-clang");
    }
    return;
  }
  const buildPath = getIdfBuildPath(workspaceFolder);
  settingsJson["clangd.path"] = espClangPath;
  settingsJson["clangd.arguments"] = [
    "--background-index",
    `--query-driver=**`,
    `--compile-commands-dir=${buildPath}`,
  ];
}

export async function configureClangSettings(
  workspaceFolder: Uri,
  showError = false
) {
  const settingsJsonPath = join(
    workspaceFolder.fsPath,
    ".vscode",
    "settings.json"
  );
  let settingsJson: any = {};
  const settingsPathExists = await pathExists(settingsJsonPath);
  if (settingsPathExists) {
    try {
      const settingsContent = await workspace.fs.readFile(
        Uri.file(settingsJsonPath)
      );
      settingsJson = parse(settingsContent.toString());
    } catch (error) {
      if (showError) {
        throw parseError(settingsJsonPath);
      }
      Logger.error(
        "Failed to parse settings.json. Ensure it has valid JSON syntax.",
        error as Error,
        "clang index configureClangSettings"
      );
      return;
    }
  }

  await setClangSettings(settingsJson, workspaceFolder, showError);

  await writeJSON(settingsJsonPath, settingsJson, {
    spaces: 2,
  });

  await createClangdFile(workspaceFolder, showError);
}

export async function createClangdFile(
  workspaceFolder: Uri,
  showError = false
) {
  const clangdFilePath = join(workspaceFolder.fsPath, ".clangd");
  const fileExists = await pathExists(clangdFilePath);
  if (fileExists) {
    Logger.info(".clangd file already exists. Skipping creation.");
    return;
  }
  const espClangPath = await validateEspClangExists();
  if (!espClangPath) {
    return;
  }
  const clangdContent = `CompileFlags:${EOL}    Remove: [-f*, -m*]${EOL}`;

  try {
    await writeFile(clangdFilePath, clangdContent, { encoding: "utf8" });
    Logger.infoNotify(".clangd file created successfully.");
  } catch (error) {
    if (showError) {
      throw error;
    }
    Logger.error(
      "Failed to create .clangd file.",
      error as Error,
      "clang index createClangdFile"
    );
  }
}
