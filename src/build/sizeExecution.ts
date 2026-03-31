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
import { addProcessTask, TaskManager } from "../taskManager";
import { MaybeIdfTaskExecution } from "./taskHelpers";
import { ESP } from "../config";
import { readParameter } from "../idfConfiguration";
import { configureEnvVariables } from "../common/prepareEnv";
import { getVirtualEnvPythonPath } from "../pythonManager";
import { join } from "path";
import { ensureDir } from "fs-extra";
import { getProjectName } from "../workspaceConfig";

export async function appendSizeExecutionIfEnabled(
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
  await ensureDir(buildDirPath);
  const projectName = await getProjectName(buildDirPath);
  const mapFilePath = join(buildDirPath, `${projectName}.map`);
  const currentEnvVars = ESP.ProjectConfiguration.store.get<{
    [key: string]: string;
  }>(ESP.ProjectConfiguration.CURRENT_IDF_CONFIGURATION, {});
  const idfPath = currentEnvVars["IDF_PATH"];
  const idfSizePath = join(idfPath, "tools", "idf_size.py");
  const pythonCommand = await getVirtualEnvPythonPath();
  const args = [idfSizePath, mapFilePath];

  const modifiedEnv = await configureEnvVariables(workspace);

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
