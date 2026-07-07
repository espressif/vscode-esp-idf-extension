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
import { readParameter } from "../../configuration/idf";
import { Logger } from "../../common/logger";
import { OutputChannel } from "../../common/outputChannel";
import { spawn } from "../../utils";
import { ConfserverProcess } from "../menuconfig/confserver/confServerProcess";
import { IdfTarget } from "./getTargets";
import {
  getCurrentIdfConfiguration,
  getVirtualEnvPythonPath,
  updateCurrentIdfEnvVar,
} from "../../configuration/env";
import { l10n, Uri } from "vscode";
import { setCCppPropertiesJsonCompilerPath } from "../../configuration/workspace";
import {
  isKnownError,
  known,
  missingDependency,
} from "../../common/error/knownError";
import { ErrorCode } from "../../common/error/types";
import { setTargetOutputChannel } from "./errorMapping";

function isSetTargetBenignOutput(message: string): boolean {
  return message.includes("are satisfied");
}

export async function setTargetInIDF(
  workspaceFolder: Uri,
  selectedTarget: IdfTarget
) {
  if (ConfserverProcess.exists()) {
    ConfserverProcess.dispose();
  }
  const buildDirPath = readParameter(
    "idf.buildPath",
    workspaceFolder
  ) as string;
  const modifiedEnv = getCurrentIdfConfiguration();
  const idfPy = join(modifiedEnv["IDF_PATH"], "tools", "idf.py");
  delete modifiedEnv.IDF_TARGET;
  const enableCCache = readParameter(
    "idf.enableCCache",
    workspaceFolder
  ) as boolean;
  const setTargetArgs: string[] = [idfPy];
  if (selectedTarget.isPreview) {
    setTargetArgs.push("--preview");
  }
  setTargetArgs.push("-B", buildDirPath);
  if (enableCCache) {
    modifiedEnv.IDF_CCACHE_ENABLE = "1";
  } else {
    delete modifiedEnv.IDF_CCACHE_ENABLE;
  }
  if (modifiedEnv.SDKCONFIG) {
    setTargetArgs.push(`-DSDKCONFIG='${modifiedEnv.SDKCONFIG}'`);
  }
  const sdkconfigDefaults =
    (readParameter("idf.sdkconfigDefaults") as string[]) || [];

  if (sdkconfigDefaults && sdkconfigDefaults.length) {
    setTargetArgs.push(
      `-DSDKCONFIG_DEFAULTS='${sdkconfigDefaults.join(";")}'`
    );
  }

  setTargetArgs.push("set-target", selectedTarget.target);
  const pythonBinPath = getVirtualEnvPythonPath();
  if (!pythonBinPath) {
    throw missingDependency("Python");
  }
  OutputChannel.appendLine("Running IDF Set Target action", setTargetOutputChannel);
  try {
    const setTargetResult = await spawn(pythonBinPath, setTargetArgs, {
      cwd: workspaceFolder.fsPath,
      env: modifiedEnv,
      silent: false,
    });
    Logger.info(setTargetResult.toString());
    const msg = l10n.t(
      "Target {0} Set Successfully.",
      selectedTarget.target.toLocaleUpperCase()
    );
    OutputChannel.appendLineAndShow(msg, setTargetOutputChannel);
    Logger.infoNotify(msg);
    updateCurrentIdfEnvVar("IDF_TARGET", selectedTarget.target);
    await setCCppPropertiesJsonCompilerPath(workspaceFolder);
    return setTargetResult.toString();
  } catch (error) {
    if (isKnownError(error)) {
      throw error;
    }
    const errMsg = error instanceof Error ? error.message : String(error);
    if (isSetTargetBenignOutput(errMsg)) {
      Logger.info(errMsg);
      OutputChannel.appendLine(errMsg, setTargetOutputChannel);
      return errMsg;
    }
    throw known(ErrorCode.TaskFailedWithOutput, { detail: errMsg });
  }
}
