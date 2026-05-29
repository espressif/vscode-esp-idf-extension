/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import { appendSdkconfigDefineArgs } from "../../../build/sdkconfigArgHelpers";

interface SharedIdfPyArgsOptions {
  enableCCache: boolean;
  sdkconfigFile?: string;
  sdkconfigDefaults?: string[];
}

interface ConfserverArgsOptions extends SharedIdfPyArgsOptions {
  workspacePath: string;
  buildDirPath: string;
}

interface ReconfigureArgsOptions extends SharedIdfPyArgsOptions {
  workspacePath: string;
}

function appendCCacheArg(args: string[], enableCCache: boolean): void {
  if (enableCCache && args.indexOf("--ccache") === -1) {
    args.push("--ccache");
  }
}

export function buildConfserverArgs(
  idfPyPath: string,
  options: ConfserverArgsOptions
): string[] {
  const args: string[] = [idfPyPath];
  appendCCacheArg(args, options.enableCCache);
  args.push("-B", options.buildDirPath);
  appendSdkconfigDefineArgs(args, options.sdkconfigFile, options.sdkconfigDefaults);
  args.push("-C", options.workspacePath, "confserver");
  return args;
}

export function buildReconfigureArgs(
  idfPyPath: string,
  options: ReconfigureArgsOptions
): string[] {
  const args: string[] = [idfPyPath];
  appendCCacheArg(args, options.enableCCache);
  args.push("-C", options.workspacePath);
  appendSdkconfigDefineArgs(args, options.sdkconfigFile, options.sdkconfigDefaults);
  args.push("reconfigure");
  return args;
}
