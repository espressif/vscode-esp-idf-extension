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
import { Uri } from "vscode";
import { pathExists, readFile } from "fs-extra";
import { getVirtualEnvPythonPath } from "../../configuration/env";
import { readParameter } from "../../configuration/idf";
import { getIdfBuildPath } from "../../configuration/workspace";
import {
  fileNotFound,
  invalidConfiguration,
  missingDependency,
  parseError,
} from "../../common/error/knownError";
import { menuconfigErrorPresentation } from "./menuconfigErrorPresentation";

export async function resolvePythonForIdfPy(): Promise<string> {
  const pythonBinPath = getVirtualEnvPythonPath();
  if (!pythonBinPath || !(await pathExists(pythonBinPath))) {
    throw missingDependency("Python");
  }
  return pythonBinPath;
}

export function requireIdfPath(env: Record<string, string>): string {
  const idfPath = env["IDF_PATH"];
  if (!idfPath) {
    throw invalidConfiguration("IDF_PATH");
  }
  return idfPath;
}

export function kconfigMenusPath(workspaceFolder: Uri): string {
  const buildDirPath = getIdfBuildPath(workspaceFolder);
  return join(buildDirPath, "config", "kconfig_menus.json");
}

export async function requireKconfigMenusJson(
  workspaceFolder: Uri
): Promise<unknown> {
  const menusFilePath = kconfigMenusPath(workspaceFolder);
  if (!(await pathExists(menusFilePath))) {
    throw fileNotFound(menusFilePath, menuconfigErrorPresentation.fileNotFound);
  }
  try {
    return JSON.parse(await readFile(menusFilePath, "utf-8"));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw parseError(menusFilePath);
    }
    throw error;
  }
}
