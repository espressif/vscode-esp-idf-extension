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

import {
  compareVersion,
  getEspIdfFromCMake,
  spawn,
} from "../../utils";
import { getProjectMapFilePath } from "../../configuration/workspace";
import { getCurrentIdfConfiguration, getVirtualEnvPythonPath } from "../../configuration/env";
import { readParameter } from "../../configuration/idf";
import type { IDFSizeCalculateResult } from "./types";
import { CancellationToken, l10n, Progress, Uri } from "vscode";
import { join } from "path";
import {
  fileNotFound,
  invalidConfiguration,
  invalidIdfVersion,
  isKnownError,
  known,
  missingDependency,
  parseError,
} from "../../common/error/knownError";
import { ErrorCode } from "../../common/error/types";
import { sizeErrorPresentation } from "./sizeErrorPresentation";

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
  ): Promise<IDFSizeCalculateResult | undefined> {
    if (this.isCanceled || cancelToken?.isCancellationRequested) {
      return;
    }

    const mapFilePath = await this.resolveMapFilePath();

    const espIdfPath = this.idfPath();
    let version: string;
    try {
      version = await getEspIdfFromCMake(espIdfPath);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw invalidIdfVersion(
        espIdfPath,
        detail,
        sizeErrorPresentation.invalidIdfVersion
      );
    }

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
        mapFilePath,
        cancelToken
      ).then((result) => {
        bumpProgress(l10n.t("Gathering Overview"));
        return result;
      }),
      this.idfCommandInvoker(
        ["idf_size.py", mapFilePath, "--archives", ...formatArgs],
        mapFilePath,
        cancelToken
      ).then((result) => {
        bumpProgress(l10n.t("Gathering Archive List"));
        return result;
      }),
      this.idfCommandInvoker(
        ["idf_size.py", mapFilePath, "--file", ...formatArgs],
        mapFilePath,
        cancelToken
      ).then((result) => {
        bumpProgress(l10n.t("Calculating File Sizes for all the archives"));
        return result;
      }),
    ]);

    if (
      this.isCanceled ||
      cancelToken?.isCancellationRequested ||
      overview === undefined ||
      archives === undefined ||
      files === undefined
    ) {
      return;
    }

    return { archives, files, overview } as IDFSizeCalculateResult;
  }

  private async resolveMapFilePath(): Promise<string> {
    const buildDirPath = readParameter(
      "idf.buildPath",
      this.workspaceFolderUri
    ) as string;
    if (!buildDirPath) {
      throw invalidConfiguration(
        "idf.buildPath",
        sizeErrorPresentation.invalidConfiguration
      );
    }
    try {
      return await getProjectMapFilePath(this.workspaceFolderUri);
    } catch (error) {
      if (isKnownError(error) && error.code === ErrorCode.FILE_NOT_FOUND) {
        throw fileNotFound(
          String(error.metadata?.filePath),
          sizeErrorPresentation.fileNotFound
        );
      }
      throw error;
    }
  }

  private idfPath(): string {
    const currentEnvVars = getCurrentIdfConfiguration();
    return currentEnvVars["IDF_PATH"];
  }

  public async isBuiltAlready() {
    try {
      await getProjectMapFilePath(this.workspaceFolderUri);
      return true;
    } catch {
      return false;
    }
  }

  private async idfCommandInvoker(
    args: string[],
    mapFilePath: string,
    cancelToken?: CancellationToken
  ) {
    if (this.isCanceled || cancelToken?.isCancellationRequested) {
      return;
    }

    const idfPath = this.idfPath();
    const pythonBinPath = getVirtualEnvPythonPath();
    if (!pythonBinPath) {
      throw missingDependency("Python", sizeErrorPresentation.missingDependency);
    }

    try {
      const buffOut = await spawn(pythonBinPath, args, {
        cwd: join(idfPath, "tools"),
        silent: true,
        cancelToken,
      });
      const buffStr = buffOut.toString();
      try {
        return JSON.parse(buffStr);
      } catch {
        throw parseError(mapFilePath, sizeErrorPresentation.parseError);
      }
    } catch (error) {
      if (isKnownError(error)) {
        throw error;
      }
      if (this.isCanceled || cancelToken?.isCancellationRequested) {
        return;
      }
      const msg = error instanceof Error ? error.message : String(error);
      throw known(
        ErrorCode.TaskFailedWithOutput,
        { detail: msg },
      sizeErrorPresentation.taskFailedWithOutput
      );
    }
  }
}
