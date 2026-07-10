// Copyright 2019 Espressif Systems (Shanghai) CO LTD
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {
  ConfigurationTarget,
  ExtensionContext,
  WorkspaceConfiguration,
  WorkspaceFolder,
  workspace,
} from "vscode";
import { Logger } from "../common/logger";

const MIGRATION_FLAG = "idf.migratedWinPortBuildPathSettings";

const LEGACY_TO_CANONICAL = [
  { legacy: "idf.portWin", canonical: "idf.port" },
  { legacy: "idf.buildPathWin", canonical: "idf.buildPath" },
] as const;

const LEGACY_BUILD_PATH_WIN_DEFAULT = "${workspaceFolder}\\build";

type ScopeProperty = "globalValue" | "workspaceValue" | "workspaceFolderValue";

type ScopeConfig = {
  target: ConfigurationTarget;
  property: ScopeProperty;
  folder?: WorkspaceFolder;
};

export function isLegacyDefaultValue(
  legacyKey: string,
  legacyValue: unknown,
  canonicalDefault: unknown
): boolean {
  if (legacyKey === "idf.portWin") {
    return legacyValue === canonicalDefault;
  }
  if (legacyKey === "idf.buildPathWin") {
    return (
      legacyValue === canonicalDefault ||
      legacyValue === LEGACY_BUILD_PATH_WIN_DEFAULT ||
      legacyValue === "build"
    );
  }
  return false;
}

function getScopeConfigs(): ScopeConfig[] {
  const scopes: ScopeConfig[] = [
    { target: ConfigurationTarget.Global, property: "globalValue" },
    { target: ConfigurationTarget.Workspace, property: "workspaceValue" },
  ];
  for (const folder of workspace.workspaceFolders ?? []) {
    scopes.push({
      target: ConfigurationTarget.WorkspaceFolder,
      property: "workspaceFolderValue",
      folder,
    });
  }
  return scopes;
}

function getConfigurationForScope(scope: ScopeConfig): WorkspaceConfiguration {
  return scope.folder
    ? workspace.getConfiguration("", scope.folder.uri)
    : workspace.getConfiguration();
}

async function migrateScope(
  scope: ScopeConfig,
  legacy: string,
  canonical: string
): Promise<void> {
  const config = getConfigurationForScope(scope);
  const legacyInspect = config.inspect(legacy);
  const legacyValue = legacyInspect?.[scope.property];
  if (legacyValue === undefined) {
    return;
  }

  const canonicalInspect = config.inspect(canonical);
  const canonicalDefault = canonicalInspect?.defaultValue;
  const canonicalExplicit = canonicalInspect?.[scope.property];

  if (isLegacyDefaultValue(legacy, legacyValue, canonicalDefault)) {
    await config.update(legacy, undefined, scope.target);
    Logger.info(
      `Removed default legacy setting ${legacy} at ${scope.property}`,
      "migrateWinSettings"
    );
    return;
  }

  if (canonicalExplicit === undefined) {
    await config.update(canonical, legacyValue, scope.target);
    Logger.info(
      `Migrated ${legacy} to ${canonical} at ${scope.property}`,
      "migrateWinSettings"
    );
  } else {
    Logger.info(
      `Removed legacy setting ${legacy}; ${canonical} already set at ${scope.property}`,
      "migrateWinSettings"
    );
  }

  await config.update(legacy, undefined, scope.target);
}

export async function migrateLegacyWinPortAndBuildPathSettings(
  context: ExtensionContext,
  options?: { platform?: NodeJS.Platform }
): Promise<void> {
  const platform = options?.platform ?? process.platform;
  if (platform !== "win32") {
    return;
  }

  if (context.globalState.get<boolean>(MIGRATION_FLAG)) {
    return;
  }

  for (const { legacy, canonical } of LEGACY_TO_CANONICAL) {
    for (const scope of getScopeConfigs()) {
      try {
        await migrateScope(scope, legacy, canonical);
      } catch (error) {
        Logger.error(
          `Failed to migrate ${legacy} at ${scope.property}`,
          error,
          "migrateWinSettings"
        );
      }
    }
  }

  await context.globalState.update(MIGRATION_FLAG, true);
}
