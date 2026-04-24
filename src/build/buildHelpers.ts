/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import { Uri } from "vscode";
import { BuildTask } from "./buildTask";
import { readParameter } from "../idfConfiguration";
import { TaskManager } from "../taskManager";

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
  const hasSdkconfigArg = args.some((a) => a.startsWith("-DSDKCONFIG="));
  if (sdkconfigFile && !hasSdkconfigArg) {
    args.push(`-DSDKCONFIG=${sdkconfigFile}`);
  }

  const hasSdkconfigDefaultsArg = args.some((a) =>
    a.startsWith("-DSDKCONFIG_DEFAULTS=")
  );
  if (
    !hasSdkconfigDefaultsArg &&
    sdkconfigDefaults &&
    sdkconfigDefaults.length > 0
  ) {
    args.push(`-DSDKCONFIG_DEFAULTS=${sdkconfigDefaults.join(";")}`);
  }

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
