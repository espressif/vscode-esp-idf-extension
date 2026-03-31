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
import { addProcessTask } from "../taskManager";
import { configureEnvVariables } from "../common/prepareEnv";
import { ESP } from "../config";
import type { OutputCapturingExecution } from "../taskManager/customExecution";
import type { ProcessExecution, Uri } from "vscode";
import { readParameter } from "../idfConfiguration";
import { runValidationBeforeBuild } from "./validation";
import { enqueueCompileTaskIfNoCache } from "./cmakeConfigure";

export class BuildTask {
  public static isBuilding: boolean;
  private buildDirPath: string;
  private currentWorkspace: Uri;

  constructor(workspaceUri: Uri) {
    this.currentWorkspace = workspaceUri;
    this.buildDirPath = readParameter(
      "idf.buildPath",
      workspaceUri
    ) as string;
  }

  public building(flag: boolean) {
    BuildTask.isBuilding = flag;
  }

  public async build(
    buildType?: ESP.BuildType,
    captureOutput?: boolean
  ): Promise<
    [
      OutputCapturingExecution | ProcessExecution | undefined,
      OutputCapturingExecution | ProcessExecution
    ]
  > {
    const modifiedEnv = await configureEnvVariables(this.currentWorkspace);
    const buildDirPath = readParameter(
      "idf.buildPath",
      this.currentWorkspace
    ) as string;
    this.buildDirPath = buildDirPath;
    await ensureDir(buildDirPath);
    const { cmakeBin, ninjaBin } = await runValidationBeforeBuild(
      modifiedEnv,
      this.currentWorkspace
    );

    const cmakeCachePath = join(buildDirPath, "CMakeCache.txt");
    const cmakeCacheExists = await pathExists(cmakeCachePath);

    let compileExecution:
      | OutputCapturingExecution
      | ProcessExecution
      | undefined;
    if (!cmakeCacheExists) {
      compileExecution = await enqueueCompileTaskIfNoCache(
        this.currentWorkspace,
        buildDirPath,
        modifiedEnv,
        cmakeBin,
        captureOutput
      );
    }

    const buildArgs =
      (readParameter("idf.ninjaArgs", this.currentWorkspace) as Array<
        string
      >) || [];
    if (buildType && buildArgs.indexOf(buildType) === -1) {
      buildArgs.push(buildType);
    }
    const buildExecution = addProcessTask(
      "Build",
      this.currentWorkspace,
      ninjaBin,
      buildArgs,
      this.buildDirPath,
      modifiedEnv,
      { captureOutput }
    );
    return [compileExecution, buildExecution];
  }
}
