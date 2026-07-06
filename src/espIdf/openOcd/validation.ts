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

import { Uri } from "vscode";
import { readParameter } from "../../configuration/idf";
import {
  idfToolNotFound,
  invalidConfiguration,
  missingDependency,
  noWorkspaceOpen,
} from "../../common/error/knownError";

export function requireOpenOcdWorkspace(workspace: Uri | undefined): Uri {
  if (!workspace) {
    throw noWorkspaceOpen();
  }
  return workspace;
}

export function requireOpenOcdBinary(openOcdPath: string): string {
  if (!openOcdPath) {
    throw idfToolNotFound("openocd");
  }
  return openOcdPath;
}

export function requireOpenOcdScripts(
  modifiedEnv: Record<string, string>
): void {
  if (typeof modifiedEnv.OPENOCD_SCRIPTS === "undefined") {
    throw missingDependency("OPENOCD_SCRIPTS");
  }
}

export function requireOpenOcdLaunchConfig(
  workspace: Uri,
  modifiedEnv: Record<string, string>
): void {
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
    throw invalidConfiguration("idf.openOcdConfigs");
  }
}

export function validateOpenOcdStartPrerequisites(
  workspace: Uri | undefined,
  openOcdPath: string,
  modifiedEnv: Record<string, string>
): Uri {
  const ws = requireOpenOcdWorkspace(workspace);
  requireOpenOcdBinary(openOcdPath);
  requireOpenOcdLaunchConfig(ws, modifiedEnv);
  return ws;
}
