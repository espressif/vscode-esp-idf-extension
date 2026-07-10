/*
 * Project: ESP-IDF VSCode Extension
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

import { join } from "path";
import { commands, WorkspaceFolder } from "vscode";
import { ErrorSeverity } from "../common/customNotifications";
import { pathExists } from "fs-extra";
import { readParameter } from "../configuration/idf";
import { getCurrentIdfConfiguration } from "../configuration/env";
import { getCurrentIdfSetup } from "../eim/loadIdfSetup";
import { IdfSetup } from "../eim/types";
import {
  fileNotFound,
  invalidConfiguration,
} from "../common/error/knownError";

export type TerminalLaunchConfig = {
  shellPath: string;
  shellArgs: string[];
  env: Record<string, string>;
  cwd: string;
  activationScriptPath: string;
};

let getCurrentIdfSetupForTests:
  | ((workspaceFolder: WorkspaceFolder) => Promise<IdfSetup | undefined>)
  | undefined;

export function setGetCurrentIdfSetupForTests(
  fn:
    | ((workspaceFolder: WorkspaceFolder) => Promise<IdfSetup | undefined>)
    | undefined
): void {
  getCurrentIdfSetupForTests = fn;
}

async function loadCurrentIdfSetup(
  workspaceFolder: WorkspaceFolder
): Promise<IdfSetup | undefined> {
  if (getCurrentIdfSetupForTests) {
    return getCurrentIdfSetupForTests(workspaceFolder);
  }
  return getCurrentIdfSetup(workspaceFolder);
}

async function resolveActivationScriptPath(
  currentSetup: IdfSetup,
  extensionPath: string
): Promise<string> {
  if (await pathExists(currentSetup.activationScript)) {
    return currentSetup.activationScript;
  }
  if (process.platform === "win32") {
    const fallbackPath = join(extensionPath, "export.ps1");
    if (await pathExists(fallbackPath)) {
      return fallbackPath;
    }
    throw fileNotFound(fallbackPath, {
      severity: ErrorSeverity.Error,
      userMessage:
        "Required file {filePath} could not be found for terminal activation.",
      logMessage: "Terminal activation file not found: {filePath}.",
      actions: [],
      outputChannel: "Terminal",
    });
  }
  throw fileNotFound(currentSetup.activationScript, {
    severity: ErrorSeverity.Error,
    userMessage:
      "Required file {filePath} could not be found for terminal activation.",
    logMessage: "Terminal activation file not found: {filePath}.",
    actions: [],
    outputChannel: "Terminal",
  });
}

export async function loadTerminalLaunchConfig(
  workspaceFolder: WorkspaceFolder,
  extensionPath: string
): Promise<TerminalLaunchConfig> {
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

  const shellExecutablePath = readParameter(
    "idf.customTerminalExecutable",
    workspaceFolder
  ) as string;
  const shellPath =
    process.platform === "win32"
      ? "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"
      : shellExecutablePath
        ? shellExecutablePath
        : "bash";

  if (process.platform !== "win32" && shellExecutablePath) {
    if (!(await pathExists(shellExecutablePath))) {
      throw fileNotFound(shellExecutablePath, {
        severity: ErrorSeverity.Error,
        userMessage:
          "Required file {filePath} could not be found for terminal activation.",
        logMessage: "Terminal activation file not found: {filePath}.",
        actions: [],
        outputChannel: "Terminal",
      });
    }
  }

  const currentSetup = await loadCurrentIdfSetup(workspaceFolder);
  if (!currentSetup) {
    throw invalidConfiguration("idf.currentSetup", {
      severity: ErrorSeverity.Error,
      userMessage:
        "No ESP-IDF setup is selected. Please select an ESP-IDF version.",
      logMessage: "ESP-IDF setup not found for terminal activation.",
      actions: [
        {
          label: "Select ESP-IDF Version",
          execute: () =>
            commands.executeCommand("espIdf.selectCurrentIdfVersion"),
        },
      ],
      outputChannel: "Terminal",
    });
  }

  const idfPath = currentSetup.idfPath;
  if (!idfPath) {
    throw invalidConfiguration("IDF_PATH", {
      severity: ErrorSeverity.Error,
      userMessage:
        "No ESP-IDF setup is selected. Please select an ESP-IDF version.",
      logMessage: "ESP-IDF setup not found for terminal activation.",
      actions: [
        {
          label: "Select ESP-IDF Version",
          execute: () =>
            commands.executeCommand("espIdf.selectCurrentIdfVersion"),
        },
      ],
      outputChannel: "Terminal",
    });
  }
  if (!(await pathExists(idfPath))) {
    throw fileNotFound(idfPath, {
      severity: ErrorSeverity.Error,
      userMessage:
        "Required file {filePath} could not be found for terminal activation.",
      logMessage: "Terminal activation file not found: {filePath}.",
      actions: [],
      outputChannel: "Terminal",
    });
  }

  const activationScriptPath = await resolveActivationScriptPath(
    currentSetup,
    extensionPath
  );

  const env = getCurrentIdfConfiguration();
  const cwd =
    workspaceFolder.uri.fsPath || idfPath || process.cwd();

  return {
    shellPath,
    shellArgs,
    env,
    cwd,
    activationScriptPath,
  };
}
