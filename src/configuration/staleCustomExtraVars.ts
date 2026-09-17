/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 17th September 2026
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
import { isAbsolute } from "path";
import {
  commands,
  ConfigurationTarget,
  l10n,
  workspace,
  WorkspaceFolder,
} from "vscode";
import {
  ErrorSeverity,
  showNotificationWithMultipleActions,
} from "../common/customNotifications";
import { Logger } from "../common/logger";
import { ESP } from "../config";

export interface StaleCustomExtraVar {
  name: string;
  value: string;
  setupValue: string;
}

/**
 * A custom extra var is stale when the ESP-IDF setup already provides the same
 * variable and the custom value is an absolute path that does not exist. Such
 * entries are skipped when the environment is expanded, so the setup value wins.
 */
export async function findStaleCustomExtraVars(
  customExtraVars: { [key: string]: unknown } | undefined,
  setupEnvVars: { [key: string]: string } | undefined
): Promise<StaleCustomExtraVar[]> {
  if (!customExtraVars || !setupEnvVars) {
    return [];
  }
  const stale: StaleCustomExtraVar[] = [];
  for (const [name, value] of Object.entries(customExtraVars)) {
    if (name.toUpperCase() === "PATH" || typeof value !== "string") {
      continue;
    }
    const setupValue = setupEnvVars[name];
    if (
      typeof setupValue !== "string" ||
      setupValue === value ||
      !isAbsolute(value)
    ) {
      continue;
    }
    if (!(await pathExists(value))) {
      stale.push({ name, value, setupValue });
    }
  }
  return stale;
}

export function getCustomExtraVarsFromSettings(
  workspaceFolder: WorkspaceFolder
): { [key: string]: unknown } | undefined {
  const value = workspace
    .getConfiguration("idf", workspaceFolder.uri)
    .get<{ [key: string]: unknown }>("customExtraVars");
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : undefined;
}

export async function removeCustomExtraVarsFromSettings(
  workspaceFolder: WorkspaceFolder,
  names: string[]
): Promise<void> {
  const config = workspace.getConfiguration("idf", workspaceFolder.uri);
  const inspected = config.inspect<{ [key: string]: unknown }>(
    "customExtraVars"
  );
  const scopes: [
    { [key: string]: unknown } | undefined,
    ConfigurationTarget
  ][] = [
    [inspected?.workspaceFolderValue, ConfigurationTarget.WorkspaceFolder],
    [inspected?.workspaceValue, ConfigurationTarget.Workspace],
    [inspected?.globalValue, ConfigurationTarget.Global],
  ];
  for (const [scopeValue, target] of scopes) {
    if (!scopeValue || !names.some((name) => name in scopeValue)) {
      continue;
    }
    const nextValue = { ...scopeValue };
    for (const name of names) {
      delete nextValue[name];
    }
    await config.update("customExtraVars", nextValue, target);
  }
}

export async function warnAboutStaleCustomExtraVars(
  workspaceFolder: WorkspaceFolder
): Promise<void> {
  try {
    const setupEnvVars = ESP.ProjectConfiguration.store.get<{
      [key: string]: string;
    }>(ESP.ProjectConfiguration.CURRENT_IDF_SETUP_ENV);
    const stale = await findStaleCustomExtraVars(
      getCustomExtraVarsFromSettings(workspaceFolder),
      setupEnvVars
    );
    if (stale.length === 0) {
      return;
    }
    const names = stale.map((entry) => entry.name);
    for (const entry of stale) {
      Logger.warn(
        `idf.customExtraVars.${entry.name} points to ${entry.value}, which does not exist. Using ${entry.setupValue} from the ESP-IDF setup instead.`
      );
    }
    await showNotificationWithMultipleActions(
      l10n.t(
        "Some ESP-IDF settings in this workspace point to tools that are no longer installed: {0}. The paths from the current ESP-IDF setup are being used instead.",
        names.join(", ")
      ),
      [
        {
          label: l10n.t("Remove obsolete entries"),
          execute: async () => {
            await removeCustomExtraVarsFromSettings(workspaceFolder, names);
            Logger.infoNotify(
              l10n.t(
                "Removed {0} from the idf.customExtraVars setting.",
                names.join(", ")
              )
            );
          },
        },
        {
          label: l10n.t("Show setting"),
          execute: () =>
            commands.executeCommand(
              "workbench.action.openSettings",
              "idf.customExtraVars"
            ),
        },
      ],
      ErrorSeverity.Warning
    );
  } catch (error) {
    Logger.error(
      "Failed to check idf.customExtraVars for stale entries",
      error as Error,
      "staleCustomExtraVars warnAboutStaleCustomExtraVars",
      undefined,
      false
    );
  }
}
