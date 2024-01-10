/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 9th January 2024 3:40:14 pm
 * Copyright 2024 Espressif Systems (Shanghai) CO LTD
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

import { Uri, window, env } from "vscode";
import { appendIdfAndToolsToPath, execChildProcess } from "../utils";
import { readParameter } from "../idfConfiguration";
import { OutputChannel } from "../logger/outputChannel";
import { join } from "path";
import { pathExists } from "fs-extra";
import { Logger } from "../logger/logger";

export async function createSBOM(workspace: Uri) {
  try {
    const projectDescriptionJson = join(
      workspace.fsPath,
      "build",
      "project_description.json"
    );
    const projectDescriptionExists = await pathExists(projectDescriptionJson);
    if (!projectDescriptionExists) {
      return Logger.infoNotify(
        `${projectDescriptionJson} doesn't exists for ESP-IDF SBOM tasks.`
      );
    }
    const modifiedEnv = appendIdfAndToolsToPath(workspace);
    const espIdfSbomTerminal = window.createTerminal({
      name: "ESP-IDF SBOM",
      env: modifiedEnv,
      cwd: workspace.fsPath || modifiedEnv.IDF_PATH || process.cwd(),
      strictEnv: true,
      shellArgs: [],
      shellPath: env.shell,
    });
    espIdfSbomTerminal.sendText(`esp-idf-sbom create ${projectDescriptionJson} --output-file espidf.spdx`);
    espIdfSbomTerminal.show();
    espIdfSbomTerminal.sendText(`esp-idf-sbom check espidf.spdx`);
  } catch (error) {
    const msg = error.message
      ? error.message
      : "Error create SBOM Report or check vulnerabilities.";
    Logger.errorNotify(msg, error);
  }
}

export async function installEspSBOM(workspace: Uri) {
  const pythonBinPath = readParameter("idf.pythonBinPath", workspace) as string;
  const modifiedEnv = appendIdfAndToolsToPath(workspace);
  try {
    const showResult = await execChildProcess(
      `"${pythonBinPath}" -m pip show esp-idf-sbom`,
      workspace.fsPath,
      OutputChannel.init(),
      { env: modifiedEnv }
    );
    OutputChannel.appendLine(showResult);
  } catch (error) {
    const installResult = await execChildProcess(
      `"${pythonBinPath}" -m pip install esp-idf-sbom`,
      workspace.fsPath,
      OutputChannel.init(),
      { env: modifiedEnv }
    );
    OutputChannel.appendLine(installResult);
  }
}
