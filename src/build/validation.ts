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

import { Logger } from "../common/logger";
import { idfTargetNotSet, idfToolNotFound } from "../common/error/knownError";
import { getToolchainToolName, isBinInPath } from "../utils";
import { readParameter } from "../configuration/idf";
import { Uri, workspace } from "vscode";

export async function runValidationBeforeBuild(
  envVariables: NodeJS.ProcessEnv,
  currentWorkspace: Uri
): Promise<{ cmakeBin: string; ninjaBin: string }> {
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
    throw idfToolNotFound("cmake");
  }

  const canAccessNinja = await isBinInPath("ninja", envVariables);
  if (canAccessNinja === "") {
    throw idfToolNotFound("ninja");
  }

  const idfTarget = envVariables["IDF_TARGET"];
  if (!idfTarget) {
    throw idfTargetNotSet();
  }
  const toolchainPath = getToolchainToolName(idfTarget, "gcc");
  const canAccessGcc = await isBinInPath(toolchainPath, envVariables);
  if (canAccessGcc === "") {
    throw idfToolNotFound(toolchainPath);
  }

  return { cmakeBin: canAccessCMake, ninjaBin: canAccessNinja };
}
