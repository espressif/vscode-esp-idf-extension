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

import { commands, Uri } from "vscode";
import { join } from "path";
import { pathExists } from "fs-extra";
import { getIdfBuildPath, getIdfTargetFromSdkconfig } from "../configuration/workspace";
import { selectedDFUAdapterId } from "../flash/transports/dfu/helpers";
import { getCurrentIdfConfiguration, getVirtualEnvPythonPath } from "../configuration/env";
import { addProcessTask } from "../taskManager/taskManager";
import {
  dfuTargetNotCompatible,
  flasherArgsMissing,
  idfTargetNotSet,
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

const buildFlasherArgsMissingPresentation: ErrorPresentation = {
  actions: [
    {
      label: "Build",
      execute: () => commands.executeCommand("espIdf.buildDevice"),
    },
  ],
  outputChannel: "Build",
};

const buildMissingDependencyPresentation: ErrorPresentation = {
  actions: [],
};

let getIdfTargetFromSdkconfigForTests:
  | ((workspace: Uri) => Promise<string | undefined>)
  | undefined;

/** @internal Test helper to stub IDF target resolution for DFU build. */
export function setDfuExecutionTestHooks(
  hooks?: {
    getIdfTargetFromSdkconfig?: (workspace: Uri) => Promise<string | undefined>;
  }
): void {
  getIdfTargetFromSdkconfigForTests = hooks?.getIdfTargetFromSdkconfig;
}

export async function appendDfuExecution(workspace: Uri): Promise<void> {
  const buildPath = getIdfBuildPath(workspace);
  if (!(await pathExists(join(buildPath, "flasher_args.json")))) {
    throw flasherArgsMissing(buildFlasherArgsMissingPresentation);
  }

  const resolveIdfTarget =
    getIdfTargetFromSdkconfigForTests ?? getIdfTargetFromSdkconfig;
  const adapterTargetName = await resolveIdfTarget(workspace);
  if (!adapterTargetName) {
    throw idfTargetNotSet();
  }
  if (selectedDFUAdapterId(adapterTargetName) === -1) {
    throw dfuTargetNotCompatible(adapterTargetName);
  }

  const modifiedEnv = getCurrentIdfConfiguration();
  const idfPathDir = modifiedEnv["IDF_PATH"];
  if (!idfPathDir) {
    throw invalidConfiguration(
      "IDF_PATH",
      buildInvalidConfigurationPresentation
    );
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
  const pythonBinPath = getVirtualEnvPythonPath();
  if (!pythonBinPath) {
    throw missingDependency("Python", buildMissingDependencyPresentation);
  }
  addProcessTask(
    "Write DFU bin",
    workspace,
    pythonBinPath,
    args,
    buildPath,
    modifiedEnv
  );
}
