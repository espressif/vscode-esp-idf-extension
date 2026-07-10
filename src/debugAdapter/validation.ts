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

import { DebugConfiguration, Uri, window, WorkspaceFolder } from "vscode";
import { pathExists } from "fs-extra";
import { readParameter } from "../configuration/idf";
import { getProjectElfFilePath } from "../configuration/workspace";
import { ESP } from "../config";
import {
  buildRequiredBeforeFlash,
  fileNotFound,
  idfToolNotFound,
  invalidConfiguration,
  isKnownError,
  noWorkspaceOpen,
} from "../common/error/knownError";
import { getCurrentIdfConfiguration } from "../configuration/env";
import { getToolchainToolName, isBinInPath } from "../utils";
import { verifyAppBinary } from "./verifyApp";
import { debugErrorPresentation } from "./debugErrorPresentation";

export async function requireWorkspaceFolderForDebug(
  folder: WorkspaceFolder | undefined
): Promise<WorkspaceFolder> {
  if (folder) {
    return folder;
  }
  folder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
  if (!folder) {
    folder = await window.showWorkspaceFolderPick({
      placeHolder: "Pick a workspace folder to start a debug session.",
    });
    if (!folder) {
      throw noWorkspaceOpen(debugErrorPresentation.noWorkspaceOpen);
    }
  }
  return folder;
}

export function requireBuildDirPath(folder: WorkspaceFolder): string {
  const buildDirPath = readParameter("idf.buildPath", folder) as string;
  if (!buildDirPath) {
    throw invalidConfiguration(
      "idf.buildPath",
      debugErrorPresentation.invalidConfiguration
    );
  }
  return buildDirPath;
}

export async function resolveDebugProgram(
  config: DebugConfiguration,
  folder: WorkspaceFolder
): Promise<string> {
  if (config.program) {
    return config.program as string;
  }
  const elfFilePath = await getProjectElfFilePath(folder.uri);
  if (!(await pathExists(elfFilePath))) {
    const buildDirPath = readParameter("idf.buildPath", folder) as string;
    if (buildDirPath) {
      throw buildRequiredBeforeFlash(
        buildDirPath,
        debugErrorPresentation.buildRequiredBeforeFlash
      );
    }
    throw fileNotFound(elfFilePath, debugErrorPresentation.fileNotFound);
  }
  return elfFilePath;
}

export async function resolveDebugGdb(
  config: DebugConfiguration
): Promise<string> {
  if (config.gdb) {
    return config.gdb as string;
  }
  const modifiedEnv = getCurrentIdfConfiguration();
  const idfTarget = modifiedEnv.IDF_TARGET || "esp32";
  const gdbTool = getToolchainToolName(idfTarget, "gdb");
  try {
    const gdbPath = await isBinInPath(gdbTool, modifiedEnv);
    if (!gdbPath) {
      throw idfToolNotFound("gdb", debugErrorPresentation.idfToolNotFound);
    }
    return gdbPath;
  } catch (error) {
    if (isKnownError(error)) {
      throw error;
    }
    throw idfToolNotFound("gdb", debugErrorPresentation.idfToolNotFound);
  }
}

export async function verifyAppBeforeDebug(workspaceUri: Uri): Promise<void> {
  await verifyAppBinary(workspaceUri);
}
