/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 31st March 2026 3:40:22 pm
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

import { Uri } from "vscode";
import { BuildTask } from "./buildTask";
import { readParameter } from "../idfConfiguration";
import { join } from "path";
import { pathExists } from "fs-extra";
import { Logger } from "../logger/logger";
import { getIdfTargetFromSdkconfig } from "../workspaceConfig";
import { configureEnvVariables } from "../common/prepareEnv";
import { selectedDFUAdapterId } from "../flash/transports/dfu/helpers";
import { getVirtualEnvPythonPath } from "../pythonManager";
import { addProcessTask, type MaybeIdfTaskExecution } from "../taskManager";

export async function appendDfuExecution(
  executions: Exclude<MaybeIdfTaskExecution, undefined>[],
  workspace: Uri,
  captureOutput?: boolean
): Promise<boolean> {
  const buildPath = readParameter("idf.buildPath", workspace) as string;
  if (!(await pathExists(join(buildPath, "flasher_args.json")))) {
    Logger.warnNotify(
      "flasher_args.json file is missing from the build directory, can't proceed, please build properly!"
    );
    return false;
  }

  const adapterTargetName = await getIdfTargetFromSdkconfig(workspace);
  if (
    adapterTargetName !== "esp32s2" &&
    adapterTargetName !== "esp32s3"
  ) {
    Logger.warnNotify(
      adapterTargetName
        ? `The selected device target "${adapterTargetName}" is not compatible for DFU, as a result the dfu.bin was not created.`
        : "Could not determine the selected device target, so dfu.bin was not created."
    );
    return false;
  }

  const modifiedEnv = await configureEnvVariables(workspace);
  const idfPathDir = modifiedEnv["IDF_PATH"];
  if (!idfPathDir) {
    throw new Error("IDF_PATH not found in environment");
  }
  const args = [
    join(idfPathDir, "tools", "mkdfu.py"),
    "write",
    "-o",
    join(buildPath, "dfu.bin"),
    "--json",
    join(buildPath, "flasher_args.json"),
    "--pid",
    selectedDFUAdapterId(adapterTargetName).toString(),
  ];
  const pythonBinPath = await getVirtualEnvPythonPath();
  if (!pythonBinPath) {
    throw new Error("Python path not found in environment");
  }
  const buildDfuExecution = addProcessTask(
    "Write DFU bin",
    workspace,
    pythonBinPath,
    args,
    buildPath,
    modifiedEnv,
    { captureOutput }
  );

  executions.push(buildDfuExecution);
  return true;
}
