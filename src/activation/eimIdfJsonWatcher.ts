/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 12th October 2026
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
import { basename, dirname, resolve } from "path";
import {
  commands,
  ConfigurationTarget,
  Disposable,
  FileSystemWatcher,
  RelativePattern,
  workspace,
} from "vscode";
import { Logger } from "../common/logger";
import { PreCheck } from "../common/PreCheck";
import { ESP } from "../config";
import { readParameter, writeParameter } from "../configuration/idf";
import {
  defaultEimIdfJsonPath,
  finishedIdfInstalls,
  getEimIdfJson,
} from "../eim/getExistingSetups";
import { IdfCommandTreeMode } from "../cmdTreeView/cmdTreeDataProvider";
import { ActivationFailure } from "./validate";

const catalogChangeDelayMs = 300;

export interface EimIdfJsonWatcherHost {
  getMode: () => IdfCommandTreeMode;
  isApplying: () => boolean;
  leaveForFailure: (failure: ActivationFailure) => void;
}

let watcherHost: EimIdfJsonWatcherHost | undefined;
let watcher: FileSystemWatcher | undefined;
let watcherEvents: Disposable[] = [];
let watchedPath: string | undefined;
let configListener: Disposable | undefined;
let catalogChangeTimer: ReturnType<typeof setTimeout> | undefined;
let writingEimIdfJsonPath = false;

async function resolveWatchPath(): Promise<string | undefined> {
  const customPath = readParameter("idf.eimIdfJsonPath") as string;
  if (customPath && (await pathExists(customPath))) {
    return resolve(customPath);
  }
  if (customPath) {
    writingEimIdfJsonPath = true;
    try {
      await writeParameter(
        "idf.eimIdfJsonPath",
        "",
        ConfigurationTarget.Global
      );
    } finally {
      writingEimIdfJsonPath = false;
    }
  }
  const defaultPath = defaultEimIdfJsonPath();
  if (await pathExists(defaultPath)) {
    return resolve(defaultPath);
  }
  return undefined;
}

function disposeWatcher() {
  if (catalogChangeTimer) {
    clearTimeout(catalogChangeTimer);
    catalogChangeTimer = undefined;
  }
  for (const event of watcherEvents) {
    event.dispose();
  }
  watcherEvents = [];
  watcher?.dispose();
  watcher = undefined;
  watchedPath = undefined;
}

function watchFile(filePath: string) {
  disposeWatcher();
  watchedPath = filePath;
  watcher = workspace.createFileSystemWatcher(
    new RelativePattern(dirname(filePath), basename(filePath))
  );
  const schedule = () => scheduleCatalogReaction();
  watcherEvents = [
    watcher.onDidCreate(schedule),
    watcher.onDidChange(schedule),
    watcher.onDidDelete(schedule),
  ];
}

function scheduleCatalogReaction() {
  if (catalogChangeTimer) {
    clearTimeout(catalogChangeTimer);
  }
  catalogChangeTimer = setTimeout(() => {
    catalogChangeTimer = undefined;
    void onCatalogChanged();
  }, catalogChangeDelayMs);
}

async function configuredSetupFailure(): Promise<
  ActivationFailure | undefined
> {
  const espIdfJson = await getEimIdfJson();
  if (!espIdfJson) {
    return "eimJsonMissing";
  }
  const finishedInstalls = finishedIdfInstalls(espIdfJson);
  if (!finishedInstalls.length) {
    return "noFinishedSetup";
  }
  if (!PreCheck.isWorkspaceFolderOpen()) {
    return "invalidCurrentSetup";
  }
  const workspaceFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
  const currentSetup = readParameter(
    "idf.currentSetup",
    workspaceFolder
  ) as string;
  const matchingInstall = finishedInstalls.find(
    (install) => install.path === currentSetup
  );
  if (!matchingInstall) {
    return "invalidCurrentSetup";
  }
  return undefined;
}

async function noWorkspaceCatalogFailure(): Promise<
  ActivationFailure | undefined
> {
  const espIdfJson = await getEimIdfJson();
  if (!espIdfJson) {
    return "eimJsonMissing";
  }
  if (!finishedIdfInstalls(espIdfJson).length) {
    return "noFinishedSetup";
  }
  return undefined;
}

async function onCatalogChanged() {
  if (!watcherHost || watcherHost.isApplying()) {
    return;
  }
  const mode = watcherHost.getMode();
  if (mode === "nonConfigured" || mode === "skipped") {
    await commands.executeCommand("espIdf.retryActivation");
    return;
  }
  if (mode === "configured") {
    const failure = await configuredSetupFailure();
    if (failure) {
      Logger.info(
        `eim_idf.json no longer matches idf.currentSetup (${failure}).`,
        "eimIdfJsonWatcher"
      );
      watcherHost.leaveForFailure(failure);
    }
    return;
  }
  if (mode === "configuredNoWorkspaceFolder") {
    const failure = await noWorkspaceCatalogFailure();
    if (failure) {
      Logger.info(
        `eim_idf.json has no finished ESP-IDF setup (${failure}).`,
        "eimIdfJsonWatcher"
      );
      watcherHost.leaveForFailure(failure);
    }
  }
}

async function syncWatcher(runReaction: boolean) {
  const nextPath = await resolveWatchPath();
  if (!nextPath) {
    const hadWatcher = !!watcher;
    disposeWatcher();
    if (runReaction && hadWatcher) {
      await onCatalogChanged();
    }
    return;
  }
  if (watcher && watchedPath === nextPath) {
    return;
  }
  watchFile(nextPath);
  if (runReaction) {
    await onCatalogChanged();
  }
}

export function startEimIdfJsonWatcher(host: EimIdfJsonWatcherHost) {
  watcherHost = host;
  if (!configListener) {
    configListener = workspace.onDidChangeConfiguration((event) => {
      if (
        writingEimIdfJsonPath ||
        !event.affectsConfiguration("idf.eimIdfJsonPath")
      ) {
        return;
      }
      void syncWatcher(true);
    });
  }
  return syncWatcher(false);
}

export function disposeEimIdfJsonWatcher() {
  disposeWatcher();
  configListener?.dispose();
  configListener = undefined;
  watcherHost = undefined;
}
