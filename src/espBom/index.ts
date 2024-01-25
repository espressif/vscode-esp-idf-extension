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

import {
  Uri,
  workspace,
  TaskRevealKind,
  TaskPanelKind,
  TaskPresentationOptions,
  TaskScope,
  ShellExecutionOptions,
  ShellExecution,
} from "vscode";
import { appendIdfAndToolsToPath, execChildProcess } from "../utils";
import { NotificationMode, readParameter } from "../idfConfiguration";
import { OutputChannel } from "../logger/outputChannel";
import { join } from "path";
import { pathExists } from "fs-extra";
import { Logger } from "../logger/logger";
import { TaskManager } from "../taskManager";

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
    const modifiedEnv = appendIdfAndToolsToPath(workspaceUri);
    const sbomFilePath = readParameter(
      "idf.sbomFilePath",
      workspaceUri
    ) as string;
    const sbomFileExists = await pathExists(sbomFilePath);
    if (sbomFileExists) {
      return Logger.infoNotify(
        `${sbomFilePath} exists. Please update idf.sbomFilePath to a non existing file path for ESP-IDF SBOM tasks.`
      );
    }
    const options: ShellExecutionOptions = {
      cwd: workspaceUri.fsPath,
      env: modifiedEnv,
    };
    const shellExecutablePath = readParameter(
      "idf.customTerminalExecutable",
      workspaceUri
    ) as string;
    const shellExecutableArgs = readParameter(
      "idf.customTerminalExecutableArgs",
      workspaceUri
    ) as string[];
    if (shellExecutablePath) {
      options.executable = shellExecutablePath;
    }
    if (shellExecutableArgs && shellExecutableArgs.length) {
      options.shellArgs = shellExecutableArgs;
    }
    const notificationMode = readParameter(
      "idf.notificationMode",
      workspaceUri
    ) as string;
    const curWorkspaceFolder = workspace.workspaceFolders.find(
      (w) => w.uri === workspaceUri
    );
    const showTaskOutput =
      notificationMode === NotificationMode.All ||
      notificationMode === NotificationMode.Output
        ? TaskRevealKind.Always
        : TaskRevealKind.Silent;
    const sbomPresentationOptions = {
      reveal: showTaskOutput,
      showReuseMessage: false,
      clear: false,
      panel: TaskPanelKind.Shared,
    } as TaskPresentationOptions;
    const sbomCreateExecution = new ShellExecution(
      `esp-idf-sbom create ${projectDescriptionJson} --output-file ${sbomFilePath}`,
      options
    );
    const sbomCheckExecution = new ShellExecution(
      `esp-idf-sbom check ${sbomFilePath}`,
      options
    );
    TaskManager.addTask(
      {
        type: "esp-idf",
        command: "ESP-IDF SBOM Create",
        taskId: "idf-sbom-task",
      },
      curWorkspaceFolder || TaskScope.Workspace,
      "ESP-IDF SBOM Creation",
      sbomCreateExecution,
      ["espIdf"],
      sbomPresentationOptions
    );
    TaskManager.addTask(
      {
        type: "esp-idf",
        command: "ESP-IDF SBOM Check",
        taskId: "idf-sbom-check-task",
      },
      curWorkspaceFolder || TaskScope.Workspace,
      "ESP-IDF SBOM Check",
      sbomCheckExecution,
      ["espIdf"],
      sbomPresentationOptions
    );
    await TaskManager.runTasks();
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