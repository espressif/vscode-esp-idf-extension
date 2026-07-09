/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 18th June 2026 2:43:30 pm
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

import { ExtensionContext } from "vscode";
import { registerIDFCommand } from "../common/registerCommand";
import { withProgressWrapper } from "../common/withProgressWrapper";
import { join } from "path";
import { getVirtualEnvPythonPath } from "../configuration/env";
import { readParameter } from "../configuration/idf";
import { execChildProcess } from "../utils";
import { OutputChannel } from "../common/outputChannel";
import { Logger } from "../common/logger";
import { ESP } from "../config";
import { openFolderCheck } from "../common/PreCheck";
import { missingDependency } from "../common/error/knownError";

export function getNinjaSummaryPythonPath(): string {
  const pythonBinPath = getVirtualEnvPythonPath();
  if (!pythonBinPath) {
    throw missingDependency("Python");
  }
  return pythonBinPath;
}

export function registerNinjaSummaryCommand(context: ExtensionContext) {
  registerIDFCommand(context, "espIdf.ninja.summary", async () => {
    await withProgressWrapper(
      [openFolderCheck],
      "ESP-IDF: Generating Ninja Build Summary",
      async (_progress, _cancelToken) => {
        const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
        const pythonBinPath = getNinjaSummaryPythonPath();
        const ninjaSummaryScript = join(
          context.extensionPath,
          "external",
          "chromium",
          "ninja-build-summary.py"
        );
        const buildDir = readParameter("idf.buildPath", wsFolder) as string;
        const args = [ninjaSummaryScript, "-C", buildDir];
        const summaryResult = await execChildProcess(
          pythonBinPath,
          args,
          wsFolder.uri.fsPath,
          OutputChannel.init()
        );
        const ninjaBuildMsg = `Ninja build summary - ${Date().toLocaleString()}`;
        OutputChannel.appendLine(ninjaBuildMsg);
        Logger.info(ninjaBuildMsg);
        OutputChannel.appendLine(summaryResult);
        Logger.info(summaryResult);
        OutputChannel.show();
      }
    );
  });
}
