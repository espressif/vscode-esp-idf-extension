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

import { pathExists } from "fs-extra";
import { ConfigurationTarget, Uri, workspace, WorkspaceFolder } from "vscode";
import { Logger } from "../common/logger";
import { ESP } from "../config";
import { readSettingsParameter } from "../configuration/idf";
import { getIdfConfigurationSource } from "../configuration/idfConfigurationSource";
import { SelectedIdfSetup } from "../project-conf/store";

/** Previous resource setting. Read once to seed workspace state, then removed. */
export const legacyCurrentSetupSetting = "idf.currentSetup";

export function resolveFinishedInstall<T extends { path: string }>(
  currentPath: string,
  finishedInstalls: T[],
  replaceWhenEmpty: boolean
): { install: T; replaced: boolean } | undefined {
  if (!finishedInstalls.length) {
    return;
  }
  if (currentPath) {
    const matching = finishedInstalls.find(
      (install) => install.path === currentPath
    );
    if (matching) {
      return { install: matching, replaced: false };
    }
    return { install: finishedInstalls[0], replaced: true };
  }
  if (!replaceWhenEmpty) {
    return;
  }
  return { install: finishedInstalls[0], replaced: true };
}

/**
 * An unlisted setup stays selected when the install is still on disk.
 * A stored activation script must exist too. An empty script does not block this.
 */
export function shouldKeepUnlistedCurrentSetup(input: {
  idfPathExists: boolean;
  activationScript?: string;
  activationScriptExists: boolean;
}): boolean {
  if (!input.idfPathExists) {
    return false;
  }
  if (input.activationScript && !input.activationScriptExists) {
    return false;
  }
  return true;
}

export async function keepUnlistedCurrentSetup(
  workspaceFolder: WorkspaceFolder,
  currentPath: string
): Promise<boolean> {
  const stored = ESP.ProjectConfiguration.store?.getSelectedIdfSetup(
    workspaceFolder
  );
  const activationScript = stored?.activationScript;
  const idfPathExists = await pathExists(currentPath);
  const activationScriptExists = activationScript
    ? await pathExists(activationScript)
    : false;
  return shouldKeepUnlistedCurrentSetup({
    idfPathExists,
    activationScript,
    activationScriptExists,
  });
}

export async function selectedIdfPath(
  workspaceFolder: WorkspaceFolder
): Promise<string> {
  const store = ESP.ProjectConfiguration.store;
  const stored = store?.getSelectedIdfSetup(workspaceFolder);
  if (stored?.idfPath) {
    return stored.idfPath;
  }
  const legacyPath = legacyCurrentSetupPath(workspaceFolder);
  if (!legacyPath || !store) {
    return "";
  }
  await store.setSelectedIdfSetup(workspaceFolder, { idfPath: legacyPath });
  await clearLegacyCurrentSetup(workspaceFolder);
  return legacyPath;
}

export async function persistSelectedIdfSetup(
  workspaceFolder: WorkspaceFolder,
  selection: SelectedIdfSetup,
  writeSelection = true
): Promise<boolean> {
  if (!writeSelection) {
    return false;
  }
  const store = ESP.ProjectConfiguration.store;
  if (!store || !selection.idfPath) {
    return false;
  }
  await store.setSelectedIdfSetup(workspaceFolder, selection);
  return true;
}

export async function rememberSelectedIdfSetupIfFolderOpen(
  folderPath: string,
  selection: SelectedIdfSetup
): Promise<void> {
  if (!selection.idfPath || !ESP.ProjectConfiguration.store) {
    return;
  }
  const targetPath = Uri.file(folderPath).fsPath;
  const folder = workspace.workspaceFolders?.find(
    (candidate) => candidate.uri.fsPath === targetPath
  );
  if (!folder) {
    return;
  }
  await ESP.ProjectConfiguration.store.setSelectedIdfSetup(folder, selection);
}

function legacyCurrentSetupPath(workspaceFolder: WorkspaceFolder): string {
  const value = readSettingsParameter(
    legacyCurrentSetupSetting,
    workspaceFolder
  );
  return typeof value === "string" ? value : "";
}

async function clearLegacyCurrentSetup(
  workspaceFolder: WorkspaceFolder
): Promise<void> {
  const source = getIdfConfigurationSource();
  const inspected = source.inspectGlobal(legacyCurrentSetupSetting);
  try {
    await source.updateScoped(
      "",
      workspaceFolder,
      legacyCurrentSetupSetting,
      undefined,
      ConfigurationTarget.WorkspaceFolder
    );
    if (inspected?.workspaceValue !== undefined) {
      await source.updateGlobal(
        legacyCurrentSetupSetting,
        undefined,
        ConfigurationTarget.Workspace
      );
    }
    if (inspected?.globalValue !== undefined) {
      await source.updateGlobal(
        legacyCurrentSetupSetting,
        undefined,
        ConfigurationTarget.Global
      );
    }
    source.refreshConfiguration();
  } catch (error) {
    const message =
      "Could not remove idf.currentSetup after moving it to workspace state.";
    Logger.error(
      message,
      error instanceof Error ? error : new Error(message),
      "selectedIdfSetup",
      undefined,
      false
    );
  }
}
