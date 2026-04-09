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

import { Uri } from "vscode";
import { canAccessFile, execChildProcess } from "../utils";
import { readParameter } from "../idfConfiguration";
import { OutputChannel } from "../logger/outputChannel";
import { join } from "path";
import { pathExists, lstat, constants } from "fs-extra";
import { Logger } from "../logger/logger";
import { addProcessTask, TaskManager } from "../taskManager";
import { getVirtualEnvPythonPath } from "../pythonManager";
import { configureEnvVariables } from "../common/prepareEnv";

export async function createSBOM(workspaceUri: Uri) {
  try {
    const projectDescriptionJson = join(
      workspaceUri.fsPath,
      "build",
      "project_description.json"
    );
    const projectDescriptionExists = await pathExists(projectDescriptionJson);
    if (!projectDescriptionExists) {
      return Logger.infoNotify(
        `${projectDescriptionJson} doesn't exists for ESP-IDF SBOM tasks.`
      );
    }
    const modifiedEnv = await configureEnvVariables(workspaceUri);
    const sbomFilePath = readParameter(
      "idf.sbomFilePath",
      workspaceUri
    ) as string;
    const sbomFileExists = await pathExists(sbomFilePath);
    if (sbomFileExists) {
      const sbomFileAccess = canAccessFile(sbomFilePath, constants.W_OK);
      const sbomFilePathStats = await lstat(sbomFilePath);
      if (sbomFilePathStats.isDirectory() || !sbomFileAccess) {
        return Logger.infoNotify(
          `${sbomFilePath} is not valid. Please update idf.sbomFilePath to a writable file path.`
        );
      }
    }
    const command = "esp-idf-sbom";
    const argsCreating = [
      "create",
      projectDescriptionJson,
      "--output-file",
      sbomFilePath,
    ];
    addProcessTask(
      "SBOM Create",
      workspaceUri,
      command,
      argsCreating,
      workspaceUri.fsPath,
      modifiedEnv
    );

    const argsChecking = ["check", sbomFilePath];
    addProcessTask(
      "SBOM Check",
      workspaceUri,
      command,
      argsChecking,
      workspaceUri.fsPath,
      modifiedEnv
    );
    await TaskManager.runTasks();
  } catch (error) {
    const msg = error.message
      ? error.message
      : "Error create SBOM Report or check vulnerabilities.";
    Logger.errorNotify(msg, error, "createSBOM");
  }
}

export async function installEspSBOM(workspace: Uri) {
  const pythonBinPath = await getVirtualEnvPythonPath();
  const modifiedEnv = await configureEnvVariables(workspace);
  try {
    const showResult = await execChildProcess(
      pythonBinPath,
      ["-m", "pip", "show", "esp-idf-sbom"],
      workspace.fsPath,
      OutputChannel.init(),
      { env: modifiedEnv }
    );
    OutputChannel.appendLine(showResult);
  } catch (error) {
    const installResult = await execChildProcess(
      pythonBinPath,
      [
        "-m",
        "pip",
        "install",
        "esp-idf-sbom",
        "--extra-index-url",
        "https://dl.espressif.com/pypi",
      ],
      workspace.fsPath,
      OutputChannel.init(),
      { env: modifiedEnv }
    );
    OutputChannel.appendLine(installResult);
  }
}
