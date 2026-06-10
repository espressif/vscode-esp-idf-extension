/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 3rd June 2026 3:22:58 pm
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

import { ExtensionContext, l10n, TerminalLocation, window } from "vscode";
import { registerIDFCommand } from "../common/registerCommand";
import { openFolderCheck, PreCheck } from "../common/PreCheck";
import { readParameter } from "../configuration/idf";
import { configureEnvVariables } from "../common/prepareEnv";
import { getCurrentIdfSetup } from "../eim/loadIdfSetup";
import { pathExists } from "fs-extra";
import { join } from "path";
import { Logger } from "../common/logger";
import { ESP } from "../config";

export async function registerIdfTerminalCommand(context: ExtensionContext) {
  registerIDFCommand(context, "espIdf.createIdfTerminal", () => {
    PreCheck.perform([openFolderCheck], async () => {
      await createEspIdfTerminal(context.extensionPath, "ESP-IDF Terminal");
    });
  });
}

export async function createEspIdfTerminal(
  extensionPath: string,
  terminalName: string,
  initialCommand?: string,
  location?: TerminalLocation
) {
  const workspaceFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
  if (!workspaceFolder) {
    Logger.infoNotify(l10n.t("Open a folder first."));
    return;
  }
  const shellExecutableArgs = readParameter(
    "idf.customTerminalExecutableArgs",
    workspaceFolder
  ) as string[];
  let shellArgs: string[] = [];
  if (process.platform === "win32") {
    shellArgs = ["-ExecutionPolicy", "Bypass"];
  } else if (shellExecutableArgs && shellExecutableArgs.length) {
    shellArgs = shellExecutableArgs;
  }
  let shellExecutablePath = readParameter(
    "idf.customTerminalExecutable",
    workspaceFolder
  ) as string;
  const shellPath =
    process.platform === "win32"
      ? "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"
      : shellExecutablePath
      ? shellExecutablePath
      : "bash";

  const currentSetup = await getCurrentIdfSetup(workspaceFolder.uri);
  if (!currentSetup) {
    Logger.errorNotify(
      l10n.t("Failed to load ESP-IDF setup for terminal activation"),
      new Error("ESP-IDF setup load failed"),
      "extension createEspIdfTerminal load setup"
    );
    return;
  }

  if (!currentSetup.idfPath || !(await pathExists(currentSetup.idfPath))) {
    Logger.info(
      `Creating ESP-IDF terminal with IDF_PATH: ${currentSetup.idfPath}`
    );
    return;
  }

  const modifiedEnv = await configureEnvVariables(workspaceFolder.uri);
  const espIdfTerminal = window.createTerminal({
    name: terminalName,
    env: modifiedEnv,
    cwd: workspaceFolder.uri.fsPath || currentSetup.idfPath || process.cwd(),
    strictEnv: true,
    shellArgs,
    shellPath,
    location,
  });
  const activationScriptPathExists = await pathExists(
    currentSetup.activationScript
  );

  if (process.platform === "win32") {
    const activationScriptPath = activationScriptPathExists
      ? currentSetup.activationScript
      : join(extensionPath, "export.ps1");
    espIdfTerminal.sendText(`& '${activationScriptPath.replace(/'/g, "''")}'`);
  } else if (activationScriptPathExists) {
    espIdfTerminal.sendText(
      `. '${currentSetup.activationScript.replace(/'/g, "''")}'`
    );
  }

  if (initialCommand) {
    espIdfTerminal.sendText(initialCommand);
  }

  espIdfTerminal.show();
  return espIdfTerminal;
}
