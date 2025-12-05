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
import { isBinInPath } from "../utils";
import { pathExists, writeJSON, writeFile } from "fs-extra";
import { readParameter } from "../idfConfiguration";
import { join } from "path";
import { Logger } from "../logger/logger";
import { parse } from "jsonc-parser";
import { EOL } from "os";
import { configureEnvVariables } from "../common/prepareEnv";

export async function validateEspClangExists(workspaceFolder: Uri) {
  const modifiedEnv = await configureEnvVariables(workspaceFolder);

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
  const espClangPath = await validateEspClangExists(workspaceFolder);
  if (!espClangPath) {
    if (showError) {
      const error = new Error(
        l10n.t("esp-clang not found in PATH. Make sure esp-clang is installed.")
      );
      Logger.errorNotify(
        error.message,
        error,
        "clang index configureClangSettings"
      );
    }
    return;
  }
  const buildPath = readParameter("idf.buildPath", workspaceFolder);
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
      Logger.errorNotify(
        "Failed to parse settings.json. Ensure it has valid JSON syntax.",
        error,
        "clang index configureClangSettings"
      );
      return;
    }
  }

  await setClangSettings(settingsJson, workspaceFolder, showError);

  await writeJSON(settingsJsonPath, settingsJson, {
    spaces: 2,
  });

  await createClangdFile(workspaceFolder);
}

export async function createClangdFile(workspaceFolder: Uri) {
  const clangdFilePath = join(workspaceFolder.fsPath, ".clangd");
  const fileExists = await pathExists(clangdFilePath);
  if (fileExists) {
    Logger.info(".clangd file already exists. Skipping creation.");
    return;
  }
  const espClangPath = await validateEspClangExists(workspaceFolder);
  if (!espClangPath) {
    return;
  }
  const clangdContent = `CompileFlags:${EOL}    Remove: [-f*, -m*]${EOL}`;

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
