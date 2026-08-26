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

import { TaskPanelKind, Uri } from "vscode";
import { addProcessTask, TaskManager } from "../taskManager/taskManager";
import { readParameter } from "../configuration/idf";
import {
  getCurrentIdfConfiguration,
  getVirtualEnvPythonPath,
} from "../configuration/env";
import { join } from "path";
import { getIdfBuildPath, getProjectName } from "../configuration/workspace";
import {
  invalidConfiguration,
  missingDependency,
} from "../common/error/knownError";
import { buildErrorPresentation } from "../common/error/buildErrorPresentation";

let getVirtualEnvPythonPathForTests: (() => string | undefined) | undefined;

/** @internal Test helper to stub Python path resolution. */
export function setSizeExecutionTestHooks(hooks?: {
  getVirtualEnvPythonPath?: () => string | undefined;
}): void {
  getVirtualEnvPythonPathForTests = hooks?.getVirtualEnvPythonPath;
}

function resolveVirtualEnvPythonPath(): string | undefined {
  if (getVirtualEnvPythonPathForTests) {
    return getVirtualEnvPythonPathForTests();
  }
  return getVirtualEnvPythonPath();
}

export async function runSizeTaskIfEnabled(workspace: Uri): Promise<boolean> {
  const enableSizeTask = (await readParameter(
    "idf.enableSizeTaskAfterBuildTask",
    workspace
  )) as boolean;
  if (!enableSizeTask) {
    return true;
  }
  const buildDirPath = getIdfBuildPath(workspace);
  const projectName = await getProjectName(workspace);
  const mapFilePath = join(buildDirPath, `${projectName}.map`);
  const pythonCommand = resolveVirtualEnvPythonPath();
  if (!pythonCommand) {
    throw missingDependency("Python");
  }
  const modifiedEnv = getCurrentIdfConfiguration();
  const idfPath = modifiedEnv["IDF_PATH"];
  if (!idfPath) {
    throw invalidConfiguration(
      "IDF_PATH",
      buildErrorPresentation.invalidConfiguration
    );
  }
  const idfSizePath = join(idfPath, "tools", "idf_size.py");
  const args = [idfSizePath, mapFilePath];

  addProcessTask(
    "Size",
    workspace,
    pythonCommand,
    args,
    buildDirPath,
    modifiedEnv,
    {
      presentation: { panel: TaskPanelKind.Dedicated, clear: true },
    }
  );
  return TaskManager.runTasksWithBoolean();
}
