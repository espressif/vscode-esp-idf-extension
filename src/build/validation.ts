/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 30th March 2026 4:16:57 pm
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

import { Logger } from "../logger/logger";
import { BuildTask } from "./buildTask";
import { getToolchainToolName, isBinInPath } from "../utils";
import { readParameter } from "../idfConfiguration";
import { Uri, workspace } from "vscode";

/** Synchronous acquire for callers outside `buildMain` (e.g. tests). */
export function reserveBuildSlotOrThrow(): void {
  if (!BuildTask.tryReserveBuild()) {
    throw new Error("ALREADY_BUILDING");
  }
}

export async function runValidationBeforeBuild(
  envVariables: NodeJS.ProcessEnv,
  currentWorkspace: Uri
) {
  try {
    const shallSaveBeforeBuild = readParameter(
      "idf.saveBeforeBuild",
      currentWorkspace
    );
    if (shallSaveBeforeBuild) {
      await workspace.saveAll();
    }
  } catch (error) {
    const errorMessage =
      "Failed to save unsaved files, ignoring and continuing with the build";
    Logger.error(errorMessage, error as Error, "build saveBeforeBuild");
    Logger.warnNotify(errorMessage);
  }
  const canAccessCMake = await isBinInPath("cmake", envVariables);
  if (canAccessCMake === "") {
    throw new Error("CMake executable not found");
  }

  const canAccessNinja = await isBinInPath("ninja", envVariables);
  if (canAccessNinja === "") {
    throw new Error("Ninja executable not found");
  }

  const idfTarget = envVariables["IDF_TARGET"];
  if (!idfTarget) {
    throw new Error("IDF_TARGET is not set in the environment variables.");
  }
  const toolchainPath = getToolchainToolName(idfTarget, "gcc");
  const canAccessGcc = await isBinInPath(toolchainPath, envVariables);
  if (canAccessGcc === "") {
    throw new Error("GCC executable not found in the toolchain path");
  }

  return { cmakeBin: canAccessCMake, ninjaBin: canAccessNinja };
}
