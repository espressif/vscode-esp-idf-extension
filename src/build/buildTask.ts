/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 27th September 2019 9:59:57 pm
 * Copyright 2019 Espressif Systems (Shanghai) CO LTD
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

import { ensureDir, pathExists } from "fs-extra";
import { join } from "path";
import { addProcessTask } from "../taskManager/taskManager";
import { ESP } from "../config";
import type { Uri } from "vscode";
import { readParameter } from "../configuration/idf";
import { getIdfBuildPath } from "../configuration/workspace";
import { runValidationBeforeBuild } from "./validation";
import { enqueueCompileTaskIfNoCache } from "./cmakeConfigure";
import { buildFinishFlashCmd } from "./buildFinishFlashCmd";
import { getCurrentIdfConfiguration } from "../configuration/env";

export class BuildTask {
  private currentWorkspace: Uri;

  constructor(workspaceUri: Uri) {
    this.currentWorkspace = workspaceUri;
  }

  /**
   * @remarks {@link BuildSession.acquire} must be called in {@link buildMain}
   * before this pipeline runs.
   */
  public async build(buildType?: ESP.BuildType): Promise<void> {
    const modifiedEnv = getCurrentIdfConfiguration();
    const buildDirPath = getIdfBuildPath(this.currentWorkspace);
    await ensureDir(buildDirPath);
    const { cmakeBin, ninjaBin } = await runValidationBeforeBuild(
      modifiedEnv,
      this.currentWorkspace
    );

    const cmakeCachePath = join(buildDirPath, "CMakeCache.txt");
    const cmakeCacheExists = await pathExists(cmakeCachePath);

    if (!cmakeCacheExists) {
      await enqueueCompileTaskIfNoCache(
        this.currentWorkspace,
        buildDirPath,
        modifiedEnv,
        cmakeBin
      );
    }

    const buildArgs =
      (readParameter("idf.ninjaArgs", this.currentWorkspace) as Array<
        string
      >) || [];
    if (buildType && buildArgs.indexOf(buildType) === -1) {
      buildArgs.push(buildType);
    }
    addProcessTask(
      "Build",
      this.currentWorkspace,
      ninjaBin,
      buildArgs,
      buildDirPath,
      modifiedEnv,
      {
        epilogue: () => buildFinishFlashCmd(this.currentWorkspace),
      }
    );
  }
}
