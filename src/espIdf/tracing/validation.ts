/*
 * Project: ESP-IDF VSCode Extension
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

import { Uri } from "vscode";
import { pathExists } from "fs-extra";
import { readParameter } from "../../configuration/idf";
import { getProjectElfFilePath } from "../../configuration/workspace";
import {
  buildRequiredBeforeFlash,
  fileNotFound,
  idfToolNotFound,
} from "../../common/error/knownError";
import { getCurrentIdfConfiguration } from "../../configuration/env";
import { getToolchainToolName, isBinInPath } from "../../utils";
import {
  heapTraceBuildRequiredPresentation,
  tracingFileNotFoundPresentation,
  tracingIdfToolNotFoundPresentation,
} from "./tracingOpenOcdPresentation";

export async function requireHeapTraceBuildDir(
  buildDirPath: string
): Promise<void> {
  if (!(await pathExists(buildDirPath))) {
    throw buildRequiredBeforeFlash(buildDirPath, heapTraceBuildRequiredPresentation);
  }
}

export function requireHeapTraceGdb(gdbTool: string, gdbPath: string): void {
  if (!gdbPath) {
    throw idfToolNotFound(gdbTool, tracingIdfToolNotFoundPresentation);
  }
}

export function requireHeapTraceElf(elfFilePath: string, exists: boolean): void {
  if (!exists) {
    throw fileNotFound(elfFilePath, tracingFileNotFoundPresentation);
  }
}

export async function validateHeapTraceStartPrerequisites(
  workspace: Uri
): Promise<{ buildDirPath: string; gdbTool: string; elfFilePath: string }> {
  const buildDirPath = readParameter("idf.buildPath", workspace) as string;
  await requireHeapTraceBuildDir(buildDirPath);

  const modifiedEnv = getCurrentIdfConfiguration();
  const idfTarget = modifiedEnv.IDF_TARGET || "esp32";
  const gdbTool = getToolchainToolName(idfTarget, "gdb");
  const gdbPath = await isBinInPath(gdbTool, modifiedEnv);
  requireHeapTraceGdb(gdbTool, gdbPath);

  const elfFilePath = await getProjectElfFilePath(workspace);
  const elfExists = await pathExists(elfFilePath);
  requireHeapTraceElf(elfFilePath, elfExists);

  return { buildDirPath, gdbTool, elfFilePath };
}
