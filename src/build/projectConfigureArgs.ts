/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import { Uri } from "vscode";
import { readParameter } from "../idfConfiguration";

export function replaceBuildDirArg(args: string[], buildDirPath: string): void {
  let buildPathArgsIndex = args.indexOf("-B");
  if (buildPathArgsIndex !== -1) {
    args.splice(buildPathArgsIndex, 2);
  }
  args.push("-B", buildDirPath);
}

export async function appendSdkconfigDefaultsAndCcache(
  args: string[],
  workspaceUri: Uri
): Promise<void> {
  const sdkconfigFile = readParameter(
    "idf.sdkconfigFilePath",
    workspaceUri
  ) as string;
  if (args.indexOf("SDKCONFIG") === -1) {
    args.push(`-DSDKCONFIG='${sdkconfigFile}'`);
  }

  const sdkconfigDefaults =
    (readParameter("idf.sdkconfigDefaults", workspaceUri) as string[]) || [];
  if (
    args.indexOf("SDKCONFIG_DEFAULTS") === -1 &&
    sdkconfigDefaults &&
    sdkconfigDefaults.length
  ) {
    args.push(`-DSDKCONFIG_DEFAULTS='${sdkconfigDefaults.join(";")}'`);
  }

  const enableCCache = readParameter(
    "idf.enableCCache",
    workspaceUri
  ) as boolean;
  if (enableCCache && args.length) {
    const indexOfCCache = args.indexOf("-DCCACHE_ENABLE=1");
    if (indexOfCCache === -1) {
      args.push("-DCCACHE_ENABLE=1");
    }
  }
}
