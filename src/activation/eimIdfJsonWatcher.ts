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

import { pathExists, stat } from "fs-extra";
import { basename, dirname, join, resolve } from "path";
import {
  commands,
  Disposable,
  FileSystemWatcher,
  l10n,
  RelativePattern,
  workspace,
} from "vscode";
import { Logger } from "../common/logger";
import { readParameter } from "../configuration/idf";
import { getIdfConfigurationSource } from "../configuration/idfConfigurationSource";
import { PreCheck } from "../common/PreCheck";
import { ESP } from "../config";
import {
  defaultEimIdfJsonPath,
  finishedIdfInstalls,
  getEimIdfJson,
  noteMissingCustomEimIdfJsonPath,
  resolveEimIdfJsonPath,
  unfinishedInstallDetails,
} from "../eim/getExistingSetups";
import {
  keepUnlistedCurrentSetup,
  persistSelectedIdfSetup,
  resolveFinishedInstall,
  selectedIdfPath,
} from "../eim/selectedIdfSetup";
import { couldNotSaveSelectedSetupDetail } from "../eim/setupFailureDetail";
import { IdfInstalled } from "../eim/types";
import { IdfCommandTreeMode } from "../cmdTreeView/cmdTreeDataProvider";
import { ActivationFailure } from "./validate";

const catalogChangeDelayMs = 300;

export interface EimIdfJsonWatcherHost {
  getMode: () => IdfCommandTreeMode;
  isApplying: () => boolean;
  leaveForFailure: (failure: ActivationFailure, detail?: string) => void;
  reconfigure: () => void;
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
let catalogReactionCause: "file" | "setting" = "file";

export function eimIdfJsonWatchFile(
  customPath: string,
  customIsDirectory: boolean,
  resolvedPath: string | undefined,
  defaultPath: string
): string {
  if (customPath) {
    return customIsDirectory ? join(customPath, "eim_idf.json") : customPath;
  }
  return resolvedPath || defaultPath;
}

async function pathIsDirectory(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isDirectory();
  } catch {
    return false;
  }
}

async function resolveWatchPath(): Promise<string> {
  await noteMissingCustomEimIdfJsonPath();
  const customPath = (readParameter("idf.eimIdfJsonPath") as string) || "";
  const customIsDirectory = customPath
    ? await pathIsDirectory(customPath)
    : false;
  const resolved = customPath ? undefined : await resolveEimIdfJsonPath();
  return resolve(
    eimIdfJsonWatchFile(
      customPath,
      customIsDirectory,
      resolved,
      defaultEimIdfJsonPath()
    )
  );
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
  catalogReactionCause = "file";
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
    const cause = catalogReactionCause;
    const retryWhenIdle = await onCatalogChanged(generation, cause);
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

type SelectionSync = "unchanged" | "replaced" | "kept" | "failed";

type ConfiguredCatalogReview =
  | { failure: CatalogFailure }
  | { sync: SelectionSync };

async function reviewConfiguredCatalog(
  cause: "file" | "setting"
): Promise<ConfiguredCatalogReview> {
  const espIdfJson = await getEimIdfJson();
  if (!espIdfJson) {
    return { failure: { failure: "eimJsonMissing" } };
  }
  const finishedInstalls = await finishedIdfInstalls(espIdfJson);
  if (!finishedInstalls.length) {
    return {
      failure: {
        failure: "noFinishedSetup",
        detail: await unfinishedInstallDetails(espIdfJson),
      },
    };
  }
  if (!PreCheck.isWorkspaceFolderOpen()) {
    return { sync: "unchanged" };
  }
  return { sync: await syncSelectedSetup(finishedInstalls, cause) };
}

async function syncSelectedSetup(
  finishedInstalls: IdfInstalled[],
  cause: "file" | "setting"
): Promise<SelectionSync> {
  const workspaceFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
  const currentSetup = await selectedIdfPath(workspaceFolder);
  const resolved = resolveFinishedInstall(currentSetup, finishedInstalls, true);
  if (!resolved?.replaced) {
    return "unchanged";
  }
  if (await keepUnlistedCurrentSetup(workspaceFolder, currentSetup)) {
    if (cause === "setting") {
      Logger.warnNotify(
        l10n.t(
          "The eim_idf.json path changed. The current ESP-IDF setup is not listed in the new file: {0}",
          currentSetup
        )
      );
    }
    return "kept";
  }
  const written = await persistSelectedIdfSetup(workspaceFolder, {
    idfPath: resolved.install.path,
    id: resolved.install.id,
  });
  if (!written) {
    return "failed";
  }
  const previous = currentSetup || "none";
  Logger.info(
    `Selected ESP-IDF setup ${resolved.install.path} for ${workspaceFolder.uri.fsPath} (previous: ${previous}).`,
    "eimIdfJsonWatcher"
  );
  return "replaced";
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

async function onCatalogChanged(
  generation: number,
  cause: "file" | "setting"
): Promise<boolean> {
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
    const review = await reviewConfiguredCatalog(cause);
    if (generation !== catalogGeneration || !watcherHost) {
      return false;
    }
    if ("failure" in review) {
      const message = `eim_idf.json has no usable ESP-IDF setup (${review.failure.failure}).`;
      Logger.error(
        message,
        new Error(message),
        "eimIdfJsonWatcher",
        undefined,
        false
      );
      watcherHost.leaveForFailure(
        review.failure.failure,
        review.failure.detail
      );
      return false;
    }
    if (review.sync === "replaced") {
      watcherHost.reconfigure();
      return false;
    }
    if (review.sync === "kept") {
      return false;
    }
    if (review.sync === "failed") {
      const detail = couldNotSaveSelectedSetupDetail();
      Logger.error(
        detail,
        new Error(detail),
        "eimIdfJsonWatcher",
        undefined,
        false
      );
      watcherHost.leaveForFailure("invalidCurrentSetup", detail);
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
    catalogReactionCause = "setting";
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
  } else if (
    shouldScheduleReactionAfterWatcherSync(runReaction, willRetarget)
  ) {
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
