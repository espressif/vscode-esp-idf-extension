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
  Disposable,
  FileSystemWatcher,
  RelativePattern,
  workspace,
} from "vscode";
import { Logger } from "../common/logger";
import { getIdfConfigurationSource } from "../configuration/idfConfigurationSource";
import { PreCheck } from "../common/PreCheck";
import { ESP } from "../config";
import { readParameter } from "../configuration/idf";
import {
  currentSetupRejectDetail,
  defaultEimIdfJsonPath,
  finishedIdfInstalls,
  getEimIdfJson,
  noteMissingCustomEimIdfJsonPath,
  resolveEimIdfJsonPath,
  unfinishedInstallDetails,
} from "../eim/getExistingSetups";
import { IdfCommandTreeMode } from "../cmdTreeView/cmdTreeDataProvider";
import { ActivationFailure } from "./validate";

const catalogChangeDelayMs = 300;

export interface EimIdfJsonWatcherHost {
  getMode: () => IdfCommandTreeMode;
  isApplying: () => boolean;
  leaveForFailure: (failure: ActivationFailure, detail?: string) => void;
}

export interface EimIdfJsonWatchTarget {
  base: string;
  pattern: string;
}

let watcherHost: EimIdfJsonWatcherHost | undefined;
let watcher: FileSystemWatcher | undefined;
let watcherEvents: Disposable[] = [];
let watchedKey: string | undefined;
let configListener: Disposable | undefined;
let catalogChangeTimer: ReturnType<typeof setTimeout> | undefined;
let catalogGeneration = 0;
let catalogReactionRunning = false;
let catalogReactionFollowUp = false;

async function resolveWatchPath(): Promise<string> {
  await noteMissingCustomEimIdfJsonPath();
  const resolved = await resolveEimIdfJsonPath();
  return resolve(resolved || defaultEimIdfJsonPath());
}

export async function eimIdfJsonWatchTarget(
  filePath: string
): Promise<EimIdfJsonWatchTarget> {
  const resolvedFile = resolve(filePath);
  const directory = dirname(resolvedFile);
  if (await pathExists(directory)) {
    return { base: directory, pattern: basename(resolvedFile) };
  }
  // A RelativePattern with path separators is recursive. Watch the nearest
  // existing ancestor for its next missing child only. syncWatcher retargets
  // when that child appears.
  let missing = directory;
  let parent = dirname(missing);
  while (parent !== missing && !(await pathExists(parent))) {
    missing = parent;
    parent = dirname(missing);
  }
  return { base: parent, pattern: basename(missing) };
}

function watchKey(target: EimIdfJsonWatchTarget) {
  return `${target.base}\0${target.pattern}`;
}

export function shouldScheduleReactionAfterWatcherSync(
  runReaction: boolean,
  willRetarget: boolean
): boolean {
  return !runReaction && willRetarget;
}

function closeWatcher() {
  for (const event of watcherEvents) {
    event.dispose();
  }
  watcherEvents = [];
  watcher?.dispose();
  watcher = undefined;
  watchedKey = undefined;
}

function disposeWatcher() {
  clearCatalogTimer();
  closeWatcher();
}

function watchTarget(target: EimIdfJsonWatchTarget) {
  closeWatcher();
  watchedKey = watchKey(target);
  watcher = workspace.createFileSystemWatcher(
    new RelativePattern(target.base, target.pattern)
  );
  const schedule = () => scheduleCatalogReaction();
  watcherEvents = [
    watcher.onDidCreate(schedule),
    watcher.onDidChange(schedule),
    watcher.onDidDelete(schedule),
  ];
}

function bumpCatalogGeneration() {
  catalogGeneration += 1;
}

function clearCatalogTimer() {
  if (catalogChangeTimer) {
    clearTimeout(catalogChangeTimer);
    catalogChangeTimer = undefined;
  }
}

function armCatalogTimer() {
  clearCatalogTimer();
  catalogChangeTimer = setTimeout(() => {
    catalogChangeTimer = undefined;
    void runCatalogReaction();
  }, catalogChangeDelayMs);
}

function scheduleCatalogReaction() {
  bumpCatalogGeneration();
  armCatalogTimer();
}

async function runCatalogReaction() {
  if (catalogReactionRunning) {
    catalogReactionFollowUp = true;
    return;
  }
  catalogReactionRunning = true;
  catalogReactionFollowUp = false;
  try {
    const generation = catalogGeneration;
    const retryWhenIdle = await onCatalogChanged(generation);
    if (watcherHost) {
      await syncWatcher(false);
    }
    if (retryWhenIdle && generation === catalogGeneration) {
      armCatalogTimer();
    }
  } finally {
    catalogReactionRunning = false;
    if (catalogReactionFollowUp) {
      catalogReactionFollowUp = false;
      void runCatalogReaction();
    }
  }
}

type CatalogFailure = { failure: ActivationFailure; detail?: string };

async function configuredSetupFailure(): Promise<CatalogFailure | undefined> {
  const espIdfJson = await getEimIdfJson();
  if (!espIdfJson) {
    return { failure: "eimJsonMissing" };
  }
  const finishedInstalls = await finishedIdfInstalls(espIdfJson);
  if (!finishedInstalls.length) {
    return {
      failure: "noFinishedSetup",
      detail: await unfinishedInstallDetails(espIdfJson),
    };
  }
  if (!PreCheck.isWorkspaceFolderOpen()) {
    return undefined;
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
    return {
      failure: "invalidCurrentSetup",
      detail: await currentSetupRejectDetail(espIdfJson, currentSetup),
    };
  }
  return undefined;
}

async function noWorkspaceCatalogFailure(): Promise<
  CatalogFailure | undefined
> {
  const espIdfJson = await getEimIdfJson();
  if (!espIdfJson) {
    return { failure: "eimJsonMissing" };
  }
  if (!(await finishedIdfInstalls(espIdfJson)).length) {
    return {
      failure: "noFinishedSetup",
      detail: await unfinishedInstallDetails(espIdfJson),
    };
  }
  return undefined;
}

async function onCatalogChanged(generation: number): Promise<boolean> {
  if (!watcherHost || generation !== catalogGeneration) {
    return false;
  }
  if (watcherHost.isApplying()) {
    return true;
  }
  const mode = watcherHost.getMode();
  if (mode === "nonConfigured" || mode === "skipped" || mode === "undetected") {
    if (generation !== catalogGeneration) {
      return false;
    }
    await commands.executeCommand("espIdf.retryActivation");
    return false;
  }
  if (mode === "configuredFromEnvVars") {
    return false;
  }
  if (mode === "configured") {
    const failure = await configuredSetupFailure();
    if (generation !== catalogGeneration || !watcherHost) {
      return false;
    }
    if (failure) {
      const message = `eim_idf.json no longer matches idf.currentSetup (${failure.failure}).`;
      Logger.error(
        message,
        new Error(message),
        "eimIdfJsonWatcher",
        undefined,
        false
      );
      watcherHost.leaveForFailure(failure.failure, failure.detail);
    }
    return false;
  }
  if (mode === "configuredNoWorkspaceFolder") {
    const failure = await noWorkspaceCatalogFailure();
    if (generation !== catalogGeneration || !watcherHost) {
      return false;
    }
    if (failure) {
      const message = `eim_idf.json has no finished ESP-IDF setup (${failure.failure}).`;
      Logger.error(
        message,
        new Error(message),
        "eimIdfJsonWatcher",
        undefined,
        false
      );
      watcherHost.leaveForFailure(failure.failure, failure.detail);
    }
  }
  return false;
}

async function syncWatcher(runReaction: boolean) {
  if (runReaction) {
    getIdfConfigurationSource().refreshConfiguration();
    bumpCatalogGeneration();
    clearCatalogTimer();
  }
  const nextPath = await resolveWatchPath();
  if (!watcherHost) {
    return;
  }
  const target = await eimIdfJsonWatchTarget(nextPath);
  if (!watcherHost) {
    return;
  }
  const nextKey = watchKey(target);
  if (watcher && watchedKey === nextKey) {
    if (runReaction) {
      await runCatalogReaction();
    }
    return;
  }
  const willRetarget = watchedKey !== nextKey || !watcher;
  if (runReaction) {
    clearCatalogTimer();
  }
  watchTarget(target);
  if (runReaction) {
    await runCatalogReaction();
  } else if (shouldScheduleReactionAfterWatcherSync(runReaction, willRetarget)) {
    scheduleCatalogReaction();
  }
}

export function startEimIdfJsonWatcher(host: EimIdfJsonWatcherHost) {
  watcherHost = host;
  if (!configListener) {
    configListener = workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration("idf.eimIdfJsonPath")) {
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
