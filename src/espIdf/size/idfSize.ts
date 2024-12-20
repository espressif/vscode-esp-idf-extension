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

import * as path from "path";
import * as vscode from "vscode";
import * as idfConf from "../../idfConfiguration";
import { Logger } from "../../logger/logger";
import { fileExists, spawn } from "../../utils";
import { getProjectName } from "../../workspaceConfig";
import * as utils from "../../utils";
import { getVirtualEnvPythonPath } from "../../pythonManager";

export class IDFSize {
  private readonly workspaceFolderUri: vscode.Uri;
  private isCanceled: boolean;
  constructor(workspaceRoot: vscode.Uri) {
    this.workspaceFolderUri = workspaceRoot;
  }
  public cancel() {
    this.isCanceled = true;
  }
  public async calculateWithProgress(
    progress: vscode.Progress<{ message: string; increment: number }>
  ) {
    if (this.isCanceled) {
      throw new Error(
        vscode.l10n.t("Cannot proceed with size analysis on a canceled context")
      );
    }
    const isBuilt = await this.isBuiltAlready();
    if (!isBuilt) {
      throw new Error(
        vscode.l10n.t(
          "Build is required for a size analysis, build your project first"
        )
      );
    }
    try {
      const mapFilePath = await this.mapFilePath();

      let locMsg = vscode.l10n.t("Gathering Overview");
      const espIdfPath = this.idfPath();
      const version = await utils.getEspIdfFromCMake(espIdfPath);
      const formatArgs =
        utils.compareVersion(version, "5.3.0") >= 0
          ? ["--format", "json2"]
          : utils.compareVersion(version, "5.1.0") >= 0
          ? ["--format", "json"]
          : ["--json"];
      const overview = await this.idfCommandInvoker([
        "idf_size.py",
        mapFilePath,
        ...formatArgs,
      ]);
      progress.report({ increment: 30, message: locMsg });

      locMsg = vscode.l10n.t("Gathering Archive List");
      const archives = await this.idfCommandInvoker([
        "idf_size.py",
        mapFilePath,
        "--archives",
        ...formatArgs,
      ]);
      progress.report({ increment: 30, message: locMsg });

      locMsg = vscode.l10n.t("Calculating File Sizes for all the archives");
      const files = await this.idfCommandInvoker([
        "idf_size.py",
        mapFilePath,
        "--file",
        ...formatArgs,
      ]);
      progress.report({ increment: 30, message: locMsg });

      return { archives, files, overview };
    } catch (error) {
      throw error;
    }
  }

  private async mapFilePath() {
    const buildDirPath = idfConf.readParameter(
      "idf.buildPath",
      this.workspaceFolderUri
    ) as string;
    const projectName = await getProjectName(buildDirPath);
    return path.join(buildDirPath, `${projectName}.map`);
  }

  private idfPath(): string {
    const customExtraVars = idfConf.readParameter(
      "idf.customExtraVars",
      this.workspaceFolderUri
    ) as { [key: string]: string };
    const idfPathDir = customExtraVars["IDF_PATH"];
    return path.join(idfPathDir, "tools");
  }

  public async isBuiltAlready() {
    return fileExists(await this.mapFilePath());
  }

  private async idfCommandInvoker(args: string[]) {
    const idfPath = this.idfPath();
    try {
      const pythonBinPath = await getVirtualEnvPythonPath(
        this.workspaceFolderUri
      );
      const buffOut = await spawn(pythonBinPath, args, {
        cwd: idfPath,
      });
      const buffStr = buffOut.toString();
      const buffObj = JSON.parse(buffStr);
      return buffObj;
    } catch (error) {
      const throwableError = new Error(
        vscode.l10n.t("Error encountered while calling idf_size.py")
      );
      Logger.error(error.message, error, "IDFSize idfCommandInvoker");
      throw throwableError;
    }
  }
}
