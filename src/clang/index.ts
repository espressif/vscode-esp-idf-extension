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

import { ExtensionContext, l10n, Uri, window } from "vscode";
import { execChildProcess } from "../support/execChildProcess";
import { isBinInPath } from "../utils";
import { pathExists, readFile, writeFile } from "fs-extra";
import { getIdfBuildPath } from "../configuration/workspace";
import { join } from "path";
import { Logger } from "../common/logger";
import { ParseError, parse, printParseErrorCode } from "jsonc-parser";
import { EOL } from "os";
import { updateJsonPreservingComments } from "../jsonc/updateJsonPreservingComments";
import { registerIDFCommand } from "../common/registerCommand";
import { openFolderCheck, PreCheck } from "../common/PreCheck";
import { idfToolNotFound, parseError } from "../common/error/knownError";
import { ESP } from "../config";
import {
  getCurrentIdfConfiguration,
  getCurrentIdfEnvVar,
} from "../configuration/env";

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
  buildPath: string,
  showError = false
) {
  const espClangPath = await validateEspClangExists();
  if (!espClangPath) {
    if (showError) {
      throw idfToolNotFound("esp-clang");
    }
    return;
  }
  const clangdArguments = [
    "--background-index",
    `--query-driver=**`,
    `--compile-commands-dir=${buildPath}`,
  ];
  const clangdConfigFile = await resolveEspClangdConfigFile(
    idfPathForClangConfig(settingsJson)
  );
  // esp-clang 20 exits if this option is present. Keep the other arguments.
  if (
    clangdConfigFile &&
    (await clangdSupportsCustomConfigFile(espClangPath))
  ) {
    clangdArguments.push(`--custom-config-file=${clangdConfigFile}`);
  }
  settingsJson["clangd.path"] = espClangPath;
  settingsJson["clangd.arguments"] = clangdArguments;
}

/**
 * Prefer the ESP-IDF named in these settings. The wizard writes
 * idf.currentSetup first, so a 5.2 project does not take the yaml from the
 * setup loaded in the window.
 */
function idfPathForClangConfig(settingsJson: any): string | undefined {
  const currentSetup = settingsJson["idf.currentSetup"];
  if (typeof currentSetup === "string" && currentSetup !== "") {
    return currentSetup;
  }
  const idfPath = settingsJson["idf.customExtraVars"]?.["IDF_PATH"];
  if (typeof idfPath === "string" && idfPath !== "") {
    return idfPath;
  }
  return getCurrentIdfEnvVar("IDF_PATH");
}

let clangdSupportsCustomConfigFileForTests:
  | ((clangdPath: string) => Promise<boolean>)
  | undefined;

/** Unit tests substitute the `clangd --help` probe. */
export function setClangdSupportsCustomConfigFileForTests(
  probe: ((clangdPath: string) => Promise<boolean>) | undefined
): void {
  clangdSupportsCustomConfigFileForTests = probe;
}

async function clangdSupportsCustomConfigFile(
  clangdPath: string
): Promise<boolean> {
  if (clangdSupportsCustomConfigFileForTests) {
    return clangdSupportsCustomConfigFileForTests(clangdPath);
  }
  try {
    const help = await execChildProcess(clangdPath, ["--help"], process.cwd(), {
      timeout: 15000,
      windowsHide: true,
    });
    return help.includes("--custom-config-file");
  } catch (error) {
    Logger.error(
      "Could not read clangd --help, so --custom-config-file was not added.",
      error instanceof Error ? error : new Error(String(error)),
      "clang index clangdSupportsCustomConfigFile",
      undefined,
      false
    );
    return false;
  }
}

async function resolveEspClangdConfigFile(
  idfPath: string | undefined
): Promise<string | undefined> {
  if (!idfPath) {
    return undefined;
  }
  const configFile = join(idfPath, "tools", "clangd-config.yaml");
  return (await pathExists(configFile)) ? configFile : undefined;
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
  let settingsContent = "{}";
  const settingsPathExists = await pathExists(settingsJsonPath);
  if (settingsPathExists) {
    settingsContent = await readFile(settingsJsonPath, "utf8");
  }

  const errors: ParseError[] = [];
  settingsJson = parse(settingsContent, errors, {
    allowTrailingComma: true,
  });
  if (errors.length > 0) {
    let errSummary = "";
    for (const error of errors) {
      errSummary += `Offset ${error.offset}, Length ${
        error.length
      } ErrorCode ${printParseErrorCode(error.error)}\n`;
    }
    Logger.error(
      "Failed to parse settings.json. Ensure it has valid JSON syntax.",
      new Error(`settings.json parse errors: ${errors.length}\n${errSummary}`),
      "clang index configureClangSettings",
      undefined,
      false
    );
    if (showError) {
      throw parseError(settingsJsonPath);
    }
    return;
  }

  await setClangSettings(
    settingsJson,
    getIdfBuildPath(workspaceFolder),
    showError
  );

  await updateJsonPreservingComments(settingsJsonPath, settingsJson);

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
  const clangdContent = [
    "CompileFlags:",
    "  Remove: [-m*, -f*]",
    "  BuiltinHeaders: QueryDriver",
    "",
  ].join(EOL);

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
      "clang index createClangdFile",
      undefined,
      false
    );
  }
}
