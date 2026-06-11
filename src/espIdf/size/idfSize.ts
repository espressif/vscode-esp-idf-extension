/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 21st June 2019 10:57:18 am
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

import { Logger } from "../../logger/logger";
import {
  compareVersion,
  fileExists,
  getEspIdfFromCMake,
  spawn,
} from "../../utils";
import { getProjectMapFilePath } from "../../workspaceConfig";
import { getVirtualEnvPythonPath } from "../../pythonManager";
import { ESP } from "../../config";
import type { IDFSizeCalculateResult } from "./types";
import { CancellationToken, l10n, Progress, Uri } from "vscode";
import { join } from "path";

export class IDFSize {
  private readonly workspaceFolderUri: Uri;
  private isCanceled: boolean = false;
  constructor(workspaceRoot: Uri) {
    this.workspaceFolderUri = workspaceRoot;
  }
  public cancel() {
    this.isCanceled = true;
  }
  public async calculateWithProgress(
    progress: Progress<{ message: string; increment: number }>,
    cancelToken?: CancellationToken
  ): Promise<IDFSizeCalculateResult> {
    if (this.isCanceled || cancelToken?.isCancellationRequested) {
      throw new Error(
        l10n.t("Cannot proceed with size analysis on a canceled context")
      );
    }

    const mapFilePath = await getProjectMapFilePath(this.workspaceFolderUri);
    const isBuilt = fileExists(mapFilePath);
    if (!isBuilt) {
      throw new Error(
        l10n.t(
          "Build is required for a size analysis, build your project first"
        )
      );
    }

    const espIdfPath = this.idfPath();
    const version = await getEspIdfFromCMake(espIdfPath);
    const formatArgs =
      compareVersion(version, "5.3.0") >= 0
        ? ["--format", "json2"]
        : compareVersion(version, "5.1.0") >= 0
        ? ["--format", "json"]
        : ["--json"];

    const bumpProgress = (message: string) =>
      progress.report({ increment: 30, message });

    const [overview, archives, files] = await Promise.all([
      this.idfCommandInvoker(
        ["idf_size.py", mapFilePath, ...formatArgs],
        cancelToken
      ).then((result) => {
        bumpProgress(l10n.t("Gathering Overview"));
        return result;
      }),
      this.idfCommandInvoker(
        ["idf_size.py", mapFilePath, "--archives", ...formatArgs],
        cancelToken
      ).then((result) => {
        bumpProgress(l10n.t("Gathering Archive List"));
        return result;
      }),
      this.idfCommandInvoker(
        ["idf_size.py", mapFilePath, "--file", ...formatArgs],
        cancelToken
      ).then((result) => {
        bumpProgress(l10n.t("Calculating File Sizes for all the archives"));
        return result;
      }),
    ]);

    return { archives, files, overview } as IDFSizeCalculateResult;
  }

  private idfPath(): string {
    const currentEnvVars = ESP.ProjectConfiguration.store.get<{
      [key: string]: string;
    }>(ESP.ProjectConfiguration.CURRENT_IDF_CONFIGURATION, {});
    return currentEnvVars["IDF_PATH"];
  }

  public async isBuiltAlready() {
    return fileExists(await getProjectMapFilePath(this.workspaceFolderUri));
  }

  private async idfCommandInvoker(
    args: string[],
    cancelToken?: CancellationToken
  ) {
    const idfPath = this.idfPath();
    try {
      const pythonBinPath = getVirtualEnvPythonPath();
      if (!pythonBinPath) {
        throw new Error(
          l10n.t("Python binary for the current ESP-IDF environment not found")
        );
      }
      const buffOut = await spawn(pythonBinPath, args, {
        cwd: join(idfPath, "tools"),
        silent: true,
        cancelToken,
      });
      const buffStr = buffOut.toString();
      const buffObj = JSON.parse(buffStr);
      return buffObj;
    } catch (error) {
      const throwableError = new Error(
        l10n.t("Error encountered while calling idf_size.py")
      );
      const msg = error instanceof Error ? error.message : String(error);
      Logger.error(
        msg,
        error instanceof Error ? error : new Error(msg),
        "IDFSize idfCommandInvoker"
      );
      throw throwableError;
    }
  }
}
