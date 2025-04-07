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

import { ConfigurationTarget, l10n, Uri, workspace } from "vscode";
import {
  appendIdfAndToolsToPath,
  getToolchainPath,
  isBinInPath,
} from "../utils";
import { pathExists, readJSON, writeJSON } from "fs-extra";
import { readParameter, writeParameter } from "../idfConfiguration";
import { join } from "path";
import { Logger } from "../logger/logger";

export async function validateEspClangExists(workspaceFolder: Uri) {
  const modifiedEnv = await appendIdfAndToolsToPath(workspaceFolder);

  const espClangPath = await isBinInPath(
    "clang",
    workspaceFolder.fsPath,
    modifiedEnv
  );
  return espClangPath;
}

export async function setClangSettings(settingsJson: any, workspaceFolder: Uri) {
  const espClangPath = await validateEspClangExists(workspaceFolder);
  if (!espClangPath) {
    const error = new Error(
      l10n.t("esp-clang not found in PATH. Make sure esp-clang is installed.")
    );
    Logger.errorNotify(
      error.message,
      error,
      "clang index configureClangSettings"
    );
    return;
  }
  const buildPath = readParameter("idf.buildPath", workspaceFolder);
  const gccPath = await getToolchainPath(workspaceFolder, "gcc");
  settingsJson["clang.path"] = espClangPath;
  settingsJson["clangd.arguments"] = [
    "--background-index",
    `--query-driver=${gccPath}`,
    `--compile-commands-dir=${buildPath}`,
  ];
}

export async function configureClangSettings(workspaceFolder: Uri) {
  const settingsJsonPath = join(
    workspaceFolder.fsPath,
    ".vscode",
    "settings.json"
  );
  const settingsPathExists = await pathExists(settingsJsonPath);
  if (!settingsPathExists) {
    const err = new Error("settings.json not found in .vscode folder");
    Logger.errorNotify(err.message, err, "clang index configureClangSettings");
    return;
  }
  const settingsJson = await readJSON(settingsJsonPath);

  await setClangSettings(settingsJson, workspaceFolder);
 
  await writeJSON(settingsJsonPath, settingsJson, {
    spaces: workspace.getConfiguration().get("editor.tabSize") || 2,
  });
}
