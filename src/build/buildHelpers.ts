/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import { Uri } from "vscode";
import type { BuildTask } from "./buildTask";
import { readParameter } from "../idfConfiguration";
import { TaskManager } from "../taskManager";
import { getSDKConfigFilePath } from "../utils";

export function replaceBuildDirArg(
  args: string[],
  buildDirPath: string
): void {
  let buildPathArgsIndex = args.indexOf("-B");
  if (buildPathArgsIndex !== -1) {
    args.splice(buildPathArgsIndex, 2);
  }
  args.push("-B", buildDirPath);
}

export function applySdkconfigDefaultsAndCcacheArgs(
  args: string[],
  sdkconfigFile: string,
  sdkconfigDefaults: string[],
  enableCCache: boolean
): void {
  const hasSdkconfigArg = args.some(
    (a) =>
      a.startsWith("-DSDKCONFIG=") || a.startsWith("-DSDKCONFIG='")
  );
  if (!hasSdkconfigArg) {
    args.push(`-DSDKCONFIG='${sdkconfigFile}'`);
  }

  const hasSdkconfigDefaultsArg = args.some(
    (a) =>
      a.startsWith("-DSDKCONFIG_DEFAULTS=") ||
      a.startsWith("-DSDKCONFIG_DEFAULTS='")
  );
  if (
    !hasSdkconfigDefaultsArg &&
    sdkconfigDefaults &&
    sdkconfigDefaults.length
  ) {
    args.push(`-DSDKCONFIG_DEFAULTS='${sdkconfigDefaults.join(";")}'`);
  }

  if (enableCCache && args.length) {
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
  const sdkconfigFile = await getSDKConfigFilePath(workspaceUri);
  const sdkconfigDefaults =
    (readParameter("idf.sdkconfigDefaults", workspaceUri) as string[]) || [];
  const enableCCache = readParameter(
    "idf.enableCCache",
    workspaceUri
  ) as boolean;
  applySdkconfigDefaultsAndCcacheArgs(
    args,
    sdkconfigFile,
    sdkconfigDefaults,
    enableCCache
  );
}

export function cleanupBuildState(buildTask: BuildTask): void {
  TaskManager.disposeListeners();
  buildTask.building(false);
  // Defer loading buildTask so cmakeConfigure can import this module without a cycle.
  const { BuildTask: BuildTaskCtor } = require("./buildTask") as {
    BuildTask: { isBuilding: boolean };
  };
  BuildTaskCtor.isBuilding = false;
}
