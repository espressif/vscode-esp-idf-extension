/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import type { Uri } from "vscode";
import { BuildTask } from "./buildTask";
import { readParameter } from "../configuration/idf";
import { TaskManager } from "../taskManager/taskManager";
import { appendSdkconfigDefineArgs } from "./sdkconfigArgHelpers";

export function replaceBuildDirArg(args: string[], buildDirPath: string): void {
  let buildPathArgsIndex = args.indexOf("-B");
  if (buildPathArgsIndex !== -1) {
    args.splice(buildPathArgsIndex, 2);
  }
  args.push("-B", buildDirPath);
}

export function applySdkconfigDefaultsAndCcacheArgs(
  args: string[],
  enableCCache: boolean,
  sdkconfigFile?: string,
  sdkconfigDefaults?: string[]
): void {
  appendSdkconfigDefineArgs(args, sdkconfigFile, sdkconfigDefaults);

  if (enableCCache) {
    const indexOfCCache = args.indexOf("-DCCACHE_ENABLE=1");
    if (indexOfCCache === -1) {
      args.push("-DCCACHE_ENABLE=1");
    }
  }
}

export async function appendSdkconfigDefaultsAndCcache(
  args: string[],
  workspaceUri: Uri
): Promise<void> {
  const sdkconfigFile = readParameter(
    "idf.sdkconfigFilePath",
    workspaceUri
  ) as string;
  const sdkconfigDefaults =
    (readParameter("idf.sdkconfigDefaults", workspaceUri) as string[]) || [];
  const enableCCache = readParameter(
    "idf.enableCCache",
    workspaceUri
  ) as boolean;
  applySdkconfigDefaultsAndCcacheArgs(
    args,
    enableCCache,
    sdkconfigFile,
    sdkconfigDefaults
  );
}

export function cleanupBuildState(): void {
  TaskManager.disposeListeners();
  BuildTask.releaseBuildReservation();
}
