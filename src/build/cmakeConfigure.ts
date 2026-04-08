/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import { Uri } from "vscode";
import { addProcessTask } from "../taskManager";
import {
  appendSdkconfigDefaultsAndCcache,
  replaceBuildDirArg,
} from "./buildHelpers";
import { readParameter } from "../idfConfiguration";

export async function enqueueCompileTaskIfNoCache(
  workspaceUri: Uri,
  buildDirPath: string,
  modifiedEnv: { [key: string]: string },
  cmakeBin: string,
  captureOutput?: boolean,
) {
  const defaultCompilerArgs: string[] = [
    "-G",
    "Ninja",
    "-DPYTHON_DEPS_CHECKED=1",
    "-DESP_PLATFORM=1",
  ];
  const configCompilerArgs = readParameter(
    "idf.cmakeCompilerArgs",
    workspaceUri
  ) as Array<string> | undefined;
  const compilerArgs: string[] =
    configCompilerArgs && configCompilerArgs.length > 0
      ? [...configCompilerArgs]
      : [...defaultCompilerArgs];
  replaceBuildDirArg(compilerArgs, buildDirPath);
  if (compilerArgs.indexOf("-S") === -1) {
    compilerArgs.push("-S", workspaceUri.fsPath);
  }
  await appendSdkconfigDefaultsAndCcache(compilerArgs, workspaceUri);

  return addProcessTask(
    "Compile",
    workspaceUri,
    cmakeBin,
    compilerArgs,
    buildDirPath,
    modifiedEnv,
    { captureOutput, presentation: { clear: true } }
  );
}
