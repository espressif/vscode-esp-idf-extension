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

import { isAbsolute, join, relative, sep } from "path";
import { commands, Uri } from "vscode";
import { pathExists } from "fs-extra";
import { ErrorSeverity } from "../../common/customNotifications";
import { readParameter } from "../../configuration/idf";
import {
  idfToolNotFound,
  invalidConfiguration,
  missingDependency,
  noWorkspaceOpen,
} from "../../common/error/knownError";

const selectOpenOcdBoardConfigsAction = {
  label: "Select Board Configs",
  execute: () => commands.executeCommand("espIdf.selectOpenOcdConfigFiles"),
};

export function requireOpenOcdWorkspace(workspace: Uri | undefined): Uri {
  if (!workspace) {
    throw noWorkspaceOpen();
  }
  return workspace;
}

export function requireOpenOcdBinary(openOcdPath: string): string {
  if (!openOcdPath) {
    throw idfToolNotFound("openocd", {
      severity: ErrorSeverity.Error,
      userMessage:
        "Invalid OpenOCD bin path or access is denied. Check idf.customOpenOCDPath or ensure openocd is in PATH.",
      logMessage: "{toolName} executable not found or not accessible.",
      actions: [
        {
          label: "Open Settings",
          execute: () =>
            commands.executeCommand(
              "workbench.action.openSettings",
              "idf.customOpenOCDPath"
            ),
        },
      ],
    });
  }
  return openOcdPath;
}

export function requireOpenOcdScripts(
  modifiedEnv: Record<string, string>
): void {
  if (typeof modifiedEnv.OPENOCD_SCRIPTS === "undefined") {
    throw missingDependency("OPENOCD_SCRIPTS", {
      severity: ErrorSeverity.Error,
      userMessage:
        "OPENOCD_SCRIPTS environment variable is missing. Set it in idf.customExtraVars or in your system environment.",
      logMessage: "Missing dependency: {dependency}.",
      actions: [
        {
          label: "Open Settings",
          execute: () =>
            commands.executeCommand(
              "workbench.action.openSettings",
              "idf.customExtraVars"
            ),
        },
      ],
    });
  }
}

export async function requireOpenOcdConfigFilesExist(
  openOcdScripts: string,
  configFiles: string[]
): Promise<void> {
  const missingPaths: string[] = [];
  for (const configFile of configFiles) {
    const configPath = join(openOcdScripts, configFile);
    const relativeConfigPath = relative(openOcdScripts, configPath);
    if (
      relativeConfigPath === ".." ||
      relativeConfigPath.startsWith(`..${sep}`) ||
      isAbsolute(relativeConfigPath)
    ) {
      missingPaths.push(configPath);
      continue;
    }
    if (!(await pathExists(configPath))) {
      missingPaths.push(configPath);
    }
  }

  if (missingPaths.length === 0) {
    return;
  }

  throw invalidConfiguration("idf.openOcdConfigs", {
    severity: ErrorSeverity.Error,
    userMessage: `OpenOCD config file(s) not found under OPENOCD_SCRIPTS: ${missingPaths.join(
      ", "
    )}`,
    logMessage: "Invalid extension configuration: {setting}.",
    actions: [selectOpenOcdBoardConfigsAction],
  });
}

export async function requireOpenOcdLaunchConfig(
  workspace: Uri,
  modifiedEnv: Record<string, string>
): Promise<void> {
  requireOpenOcdScripts(modifiedEnv);

  const openOcdLaunchArgs = readParameter(
    "idf.openOcdLaunchArgs",
    workspace
  ) as string[];

  if (openOcdLaunchArgs && openOcdLaunchArgs.length > 0) {
    return;
  }

  const openOcdConfigFilesList = readParameter(
    "idf.openOcdConfigs",
    workspace
  ) as string[];

  if (
    typeof openOcdConfigFilesList === "undefined" ||
    openOcdConfigFilesList.length < 1
  ) {
    throw invalidConfiguration("idf.openOcdConfigs", {
      severity: ErrorSeverity.Error,
      userMessage:
        "Invalid OpenOCD config files. Check idf.openOcdConfigs or select a board configuration.",
      logMessage: "Invalid extension configuration: {setting}.",
      actions: [selectOpenOcdBoardConfigsAction],
    });
  }

  await requireOpenOcdConfigFilesExist(
    modifiedEnv.OPENOCD_SCRIPTS,
    openOcdConfigFilesList
  );
}

export async function validateOpenOcdStartPrerequisites(
  workspace: Uri | undefined,
  openOcdPath: string,
  modifiedEnv: Record<string, string>
): Promise<Uri> {
  const ws = requireOpenOcdWorkspace(workspace);
  requireOpenOcdBinary(openOcdPath);
  await requireOpenOcdLaunchConfig(ws, modifiedEnv);
  return ws;
}
