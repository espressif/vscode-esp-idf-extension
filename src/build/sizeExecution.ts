/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 31st March 2026 3:41:43 pm
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

import { TaskPanelKind, Uri, commands } from "vscode";
import {
  addProcessTask,
  type MaybeIdfTaskExecution,
  TaskManager,
} from "../taskManager/taskManager";
import { readParameter } from "../configuration/idf";
import { getCurrentIdfConfiguration, getVirtualEnvPythonPath } from "../configuration/env";
import { join } from "path";
import { getProjectName } from "../configuration/workspace";
import {
  invalidConfiguration,
  missingDependency,
} from "../common/error/knownError";
import { ErrorPresentation } from "../common/error/types";

const buildInvalidConfigurationPresentation: ErrorPresentation = {
  actions: [
    {
      label: "Open Settings",
      execute: () =>
        commands.executeCommand(
          "workbench.action.openSettings",
          "idf.buildPath"
        ),
    },
  ],
};

const buildMissingDependencyPresentation: ErrorPresentation = {
  actions: [],
};
let getVirtualEnvPythonPathForTests: (() => string | undefined) | undefined;

/** @internal Test helper to stub Python path resolution. */
export function setSizeExecutionTestHooks(
  hooks?: {
    getVirtualEnvPythonPath?: () => string | undefined;
  }
): void {
  getVirtualEnvPythonPathForTests = hooks?.getVirtualEnvPythonPath;
}

function resolveVirtualEnvPythonPath(): string | undefined {
  if (getVirtualEnvPythonPathForTests) {
    return getVirtualEnvPythonPathForTests();
  }
  return getVirtualEnvPythonPath();
}

export async function runSizeTaskIfEnabled(
  executions: Exclude<MaybeIdfTaskExecution, undefined>[],
  workspace: Uri,
  captureOutput?: boolean
): Promise<boolean> {
  const enableSizeTask = (await readParameter(
    "idf.enableSizeTaskAfterBuildTask",
    workspace
  )) as boolean;
  if (!enableSizeTask) {
    return true;
  }
  const buildDirPath = readParameter("idf.buildPath", workspace) as string;
  if (!buildDirPath) {
    throw invalidConfiguration(
      "idf.buildPath",
      buildInvalidConfigurationPresentation
    );
  }
  const projectName = await getProjectName(workspace);
  const mapFilePath = join(buildDirPath, `${projectName}.map`);
  const pythonCommand = resolveVirtualEnvPythonPath();
  if (!pythonCommand) {
    throw missingDependency("Python", buildMissingDependencyPresentation);
  }
  const modifiedEnv = getCurrentIdfConfiguration();
  const idfPath = modifiedEnv["IDF_PATH"];
  if (!idfPath) {
    throw invalidConfiguration(
      "IDF_PATH",
      buildInvalidConfigurationPresentation
    );
  }
  const idfSizePath = join(idfPath, "tools", "idf_size.py");
  const args = [idfSizePath, mapFilePath];

  const sizeExecution = addProcessTask(
    "Size",
    workspace,
    pythonCommand,
    args,
    buildDirPath,
    modifiedEnv,
    {
      captureOutput,
      presentation: { panel: TaskPanelKind.Dedicated, clear: true },
    }
  );
  executions.push(sizeExecution);
  return TaskManager.runTasksWithBoolean();
}
