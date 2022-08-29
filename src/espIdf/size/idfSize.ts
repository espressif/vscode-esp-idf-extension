/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 21st June 2019 10:57:18 am
 * Copyright 2019 Espressif Systems (Shanghai) CO LTD
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as path from "path";
import * as vscode from "vscode";
import * as idfConf from "../../idfConfiguration";
import { LocDictionary } from "../../localizationDictionary";
import { Logger } from "../../logger/logger";
import { fileExists, spawn } from "../../utils";
import { getProjectName } from "../../workspaceConfig";

export class IDFSize {
  private readonly workspaceRoot: vscode.Uri;
  private isCanceled: boolean;
  private locDict: LocDictionary;
  constructor(workspaceRoot: vscode.Uri) {
    this.workspaceRoot = workspaceRoot;
    this.locDict = new LocDictionary(__filename);
  }
  public cancel() {
    this.isCanceled = true;
  }
  public async calculateWithProgress(
    progress: vscode.Progress<{ message: string; increment: number }>
  ) {
    if (this.isCanceled) {
      throw new Error(
        this.locDict.localize(
          "idfSize.canceledError",
          "Cannot proceed with size analysis on a canceled context"
        )
      );
    }
    const isBuilt = await this.isBuiltAlready();
    if (!isBuilt) {
      throw new Error(
        this.locDict.localize(
          "idfSize.buildFirstError",
          "Build is required for a size analysis, build your project first"
        )
      );
    }
    try {
      const mapFilePath = await this.mapFilePath();

      let locMsg = this.locDict.localize(
        "idfSize.overviewMsg",
        "Gathering Overview"
      );
      const overview = await this.idfCommandInvoker([
        "idf_size.py",
        mapFilePath,
        "--json",
      ]);
      progress.report({ increment: 30, message: locMsg });

      locMsg = this.locDict.localize(
        "idfSize.archivesMsg",
        "Gathering Archive List"
      );
      const archives = await this.idfCommandInvoker([
        "idf_size.py",
        mapFilePath,
        "--archives",
        "--json",
      ]);
      progress.report({ increment: 30, message: locMsg });

      locMsg = this.locDict.localize(
        "idfSize.filesMsg",
        "Calculating File Sizes for all the archives"
      );
      const files = await this.idfCommandInvoker([
        "idf_size.py",
        mapFilePath,
        "--file",
        "--json",
      ]);
      progress.report({ increment: 30, message: locMsg });

      return { archives, files, overview };
    } catch (error) {
      throw error;
    }
  }

  private async mapFilePath() {
    const buildDirName = idfConf.readParameter(
      "idf.buildDirectoryName",
      this.workspaceRoot
    ) as string;
    const projectName = await getProjectName(buildDirName);
    return path.join(buildDirName, `${projectName}.map`);
  }

  private idfPath(): string {
    const idfPathDir = idfConf.readParameter(
      "idf.espIdfPath",
      this.workspaceRoot
    );
    return path.join(idfPathDir, "tools");
  }

  private async isBuiltAlready() {
    return fileExists(await this.mapFilePath());
  }

  private async idfCommandInvoker(args: string[]) {
    const idfPath = this.idfPath();
    try {
      const pythonBinPath = idfConf.readParameter(
        "idf.pythonBinPath",
        this.workspaceRoot
      ) as string;
      const buffOut = await spawn(pythonBinPath, args, {
        cwd: idfPath,
      });
      const buffStr = buffOut.toString();
      const buffObj = JSON.parse(buffStr);
      return buffObj;
    } catch (error) {
      const throwableError = new Error(
        this.locDict.localize(
          "idfSize.commandError",
          "Error encountered while calling idf_size.py"
        )
      );
      Logger.error(error.message, error);
      throw throwableError;
    }
  }
}
