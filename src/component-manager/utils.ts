/*
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { existsSync } from "fs";
import { Logger } from "../common/logger";
import { spawn } from "../utils";
import { CancellationToken, Uri, l10n, workspace } from "vscode";
import { isKnownError } from "../common/error/knownError";
import { readParameter } from "../configuration/idf";
import { getIdfTargetFromSdkconfig } from "../configuration/workspace";
import { join } from "path";
import { EOL } from "os";
import {
  getCurrentIdfConfiguration,
  getVirtualEnvPythonPath,
} from "../configuration/env";
import { getCurrentIdfSetup } from "../eim/loadIdfSetup";
import { configureIdfProject } from "../newProject/utils";

export async function addDependency(
  workspace: Uri,
  dependency: string,
  component: string,
  cancelToken: CancellationToken
) {
  try {
    const modifiedEnv = getCurrentIdfConfiguration();
    const idfPathDir = modifiedEnv["IDF_PATH"];
    const idfPy = join(idfPathDir, "tools", "idf.py");
    const pythonBinPath = getVirtualEnvPythonPath();
    if (
      !existsSync(idfPathDir) ||
      !existsSync(idfPy) ||
      !pythonBinPath ||
      !existsSync(pythonBinPath)
    ) {
      throw new Error("The paths to idf, idf.py or pythonBin do not exist.");
    }
    const enableCCache = readParameter(
      "idf.enableCCache",
      workspace
    ) as boolean;
    const addDependencyArgs: string[] = [idfPy];
    if (enableCCache) {
      addDependencyArgs.push("--ccache");
    }
    addDependencyArgs.push(
      "add-dependency",
      `--component=${component}`,
      dependency,
      "reconfigure"
    );
    const addDependencyResult = await spawn(pythonBinPath, addDependencyArgs, {
      cwd: workspace.fsPath,
      env: modifiedEnv,
      cancelToken,
    });
    Logger.infoNotify(
      `Added dependency ${dependency} to the component "${component}"`
    );
    Logger.info(addDependencyResult.toString());
  } catch (error) {
    if (isKnownError(error)) {
      throw error;
    }
    const throwableError = new Error(
      l10n.t(
        `Error encountered while adding dependency {dependency} to the component "{component}"`,
        { dependency, component }
      )
    );
    const msg = error instanceof Error ? error.message : String(error);
    Logger.error(msg, error as Error, "Component manager addDependency");
    throw throwableError;
  }
}

export async function createProject(
  workspace: Uri,
  example: string,
  extensionPath: string,
  sourceWorkspace: Uri
): Promise<Uri> {
  try {
    const currentEnvVars = getCurrentIdfConfiguration();
    const idfPathDir = currentEnvVars["IDF_PATH"];
    const idfPy = join(idfPathDir, "tools", "idf.py");
    const modifiedEnv = getCurrentIdfConfiguration();
    const pythonBinPath = getVirtualEnvPythonPath();

    if (
      !existsSync(idfPathDir) ||
      !existsSync(idfPy) ||
      !pythonBinPath ||
      !existsSync(pythonBinPath)
    ) {
      throw new Error("The paths to idf, idf.py or pythonBin do not exist.");
    }

    const match = example.match(/(?<=:).*/);
    if (!match) {
      throw new Error(
        `Unexpected example format: ${example}. Expected format is "example:example_name"`
      );
    }
    const projectPath = Uri.joinPath(workspace, match[0]);

    const createProjectCommand: string[] = [
      idfPy,
      "create-project-from-example",
      `${example}`,
    ];

    const createProjectResult = await spawn(
      pythonBinPath,
      createProjectCommand,
      {
        cwd: workspace.fsPath,
        env: modifiedEnv,
      }
    );
    Logger.infoNotify(`Creating project from ${example}"`);
    Logger.info(createProjectResult.toString());

    const createdProject = projectUriFromCreateOutput(
      createProjectResult.toString(),
      projectPath
    );
    await configureCreatedProject(
      extensionPath,
      createdProject,
      sourceWorkspace
    );
    return createdProject;
  } catch (error) {
    if (isKnownError(error)) {
      throw error;
    }
    const msg = error instanceof Error ? error.message : String(error);
    const throwableError = new Error(
      `${l10n.t(
        `Error encountered while creating project from example "{example}"`,
        { example }
      )}. Original error: ${msg}`
    );
    Logger.error(msg, error as Error, "Component manager createProject");
    throw throwableError;
  }
}

function projectUriFromCreateOutput(output: string, fallback: Uri): Uri {
  const marker = "downloaded to ";
  const markerIndex = output.lastIndexOf(marker);
  if (markerIndex === -1) {
    return fallback;
  }
  const extractedPath = output
    .substring(markerIndex + marker.length)
    .split(EOL)[0]
    .trim();
  if (!extractedPath) {
    return fallback;
  }
  Logger.info(`Extracted path ${extractedPath}`);
  return Uri.file(extractedPath);
}

async function configureCreatedProject(
  extensionPath: string,
  projectDir: Uri,
  sourceWorkspace: Uri
) {
  await configureIdfProject(
    extensionPath,
    projectDir,
    await getCurrentIdfSetup(workspace.getWorkspaceFolder(sourceWorkspace)),
    "detect",
    await getIdfTargetFromSdkconfig(sourceWorkspace),
    readParameter("idf.openOcdConfigs", sourceWorkspace) as string[]
  );
}
