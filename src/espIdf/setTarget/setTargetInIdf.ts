/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 28th July 2022 4:09:10 pm
 * Copyright 2022 Espressif Systems (Shanghai) CO LTD
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

import { join } from "path";
import { WorkspaceFolder } from "vscode";
import { readParameter } from "../../idfConfiguration";
import { Logger } from "../../logger/logger";
import { OutputChannel } from "../../logger/outputChannel";
import {
  appendIdfAndToolsToPath,
  setCCppPropertiesJsonCompilerPath,
  spawn,
} from "../../utils";
import { ConfserverProcess } from "../menuconfig/confServerProcess";
import { IdfTarget } from "./getTargets";
import { getVirtualEnvPythonPath } from "../../pythonManager";

export async function setTargetInIDF(
  workspaceFolder: WorkspaceFolder,
  selectedTarget: IdfTarget
) {
  if (ConfserverProcess.exists()) {
    ConfserverProcess.dispose();
  }
  const idfPathDir = readParameter("idf.espIdfPath", workspaceFolder.uri);
  const buildDirPath = readParameter(
    "idf.buildPath",
    workspaceFolder.uri
  ) as string;
  const idfPy = join(idfPathDir, "tools", "idf.py");
  const modifiedEnv = await appendIdfAndToolsToPath(workspaceFolder.uri);
  modifiedEnv.IDF_TARGET = undefined;
  const enableCCache = readParameter(
    "idf.enableCCache",
    workspaceFolder.uri
  ) as boolean;
  const setTargetArgs: string[] = [idfPy];
  if (selectedTarget.isPreview) {
    setTargetArgs.push("--preview");
  }
  setTargetArgs.push("-B", buildDirPath);
  if (enableCCache) {
    modifiedEnv.IDF_CCACHE_ENABLE = "1";
  } else {
    modifiedEnv.IDF_CCACHE_ENABLE = undefined;
  }
  setTargetArgs.push("set-target", selectedTarget.target);
  const pythonBinPath = await getVirtualEnvPythonPath(workspaceFolder.uri);
  const setTargetResult = await spawn(pythonBinPath, setTargetArgs, {
    cwd: workspaceFolder.uri.fsPath,
    env: modifiedEnv,
  });
  Logger.info(setTargetResult.toString());
  OutputChannel.append(setTargetResult.toString());
  setCCppPropertiesJsonCompilerPath(workspaceFolder.uri);
}
