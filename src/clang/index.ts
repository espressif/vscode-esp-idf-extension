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

import { l10n, Uri, workspace } from "vscode";
import {
  appendIdfAndToolsToPath,
  getToolchainPath,
  isBinInPath,
} from "../utils";
import { pathExists, writeJSON, writeFile } from "fs-extra";
import { readParameter } from "../idfConfiguration";
import { join } from "path";
import { Logger } from "../logger/logger";
import { parse } from "jsonc-parser";

export async function validateEspClangExists(workspaceFolder: Uri) {
  const modifiedEnv = await appendIdfAndToolsToPath(workspaceFolder);

  const espClangdPath = await isBinInPath(
    "clangd",
    workspaceFolder.fsPath,
    modifiedEnv
  );
  return espClangdPath;
}

export async function setClangSettings(
  settingsJson: any,
  workspaceFolder: Uri
) {
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
  settingsJson["clangd.path"] = espClangPath;
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
  let settingsJson: any;
  try {
    const settingsContent = await workspace.fs.readFile(
      Uri.file(settingsJsonPath)
    );
    settingsJson = parse(settingsContent.toString());
  } catch (error) {
    Logger.errorNotify(
      "Failed to parse settings.json. Ensure it has valid JSON syntax.",
      error,
      "clang index configureClangSettings"
    );
    return;
  }

  await setClangSettings(settingsJson, workspaceFolder);

  await writeJSON(settingsJsonPath, settingsJson, {
    spaces: workspace.getConfiguration().get("editor.tabSize") || 2,
  });

  await createClangdFile(workspaceFolder);
}

export async function createClangdFile(workspaceFolder: Uri) {
  const clangdFilePath = join(workspaceFolder.fsPath, ".clangd");
  const clangdContent = `CompileFlags:
    Remove: [-f*, -m*]
`;

  try {
    await writeFile(clangdFilePath, clangdContent, { encoding: "utf8" });
    Logger.infoNotify(".clangd file created successfully.");
  } catch (error) {
    Logger.errorNotify(
      "Failed to create .clangd file.",
      error,
      "clang index createClangdFile"
    );
  }
}
