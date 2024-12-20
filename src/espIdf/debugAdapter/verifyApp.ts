/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 16th July 2021 4:23:24 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
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
import { Uri } from "vscode";
import { createFlashModel } from "../../flash/flashModelBuilder";
import { readParameter } from "../../idfConfiguration";
import { Logger } from "../../logger/logger";
import { appendIdfAndToolsToPath, spawn } from "../../utils";
import { pathExists } from "fs-extra";
import { getVirtualEnvPythonPath } from "../../pythonManager";

export async function verifyAppBinary(workspaceFolder: Uri) {
  const modifiedEnv = await appendIdfAndToolsToPath(workspaceFolder);
  const serialPort = readParameter("idf.port", workspaceFolder);
  const flashBaudRate = readParameter("idf.flashBaudRate", workspaceFolder);
  const pythonBinPath = await getVirtualEnvPythonPath(workspaceFolder);
  const esptoolPath = join(
    modifiedEnv["IDF_PATH"],
    "components",
    "esptool_py",
    "esptool",
    "esptool.py"
  );
  const buildDirPath = readParameter(
    "idf.buildPath",
    workspaceFolder
  ) as string;
  const flasherArgsJsonPath = join(buildDirPath, "flasher_args.json");
  const flasherArgsJsonPathExists = await pathExists(flasherArgsJsonPath);
  if (!flasherArgsJsonPathExists) {
    return Logger.info(
      `${flasherArgsJsonPath} doesn't exist. Build the project first`
    );
  }
  const model = await createFlashModel(
    flasherArgsJsonPath,
    serialPort,
    flashBaudRate
  );

  try {
    const cmdResult = await spawn(
      pythonBinPath,
      [
        esptoolPath,
        "-p",
        serialPort,
        "verify_flash",
        model.app.address,
        `build/${model.app.binFilePath}`,
      ],
      {
        cwd: workspaceFolder.fsPath,
        env: modifiedEnv,
      }
    );
    Logger.info(cmdResult.toString());
    if (
      cmdResult.toString().indexOf("verify FAILED (digest mismatch)") !== -1
    ) {
      return false;
    } else if (
      cmdResult.toString().indexOf("verify OK (digest matched)") !== -1
    ) {
      return true;
    }
    return false;
  } catch (error) {
    if (
      error &&
      error.message &&
      error.message.indexOf("verify FAILED (digest mismatch)") !== -1
    ) {
      return false;
    }
    const msg = error.message
      ? error.message
      : "Something wrong while verifying app binary.";
    Logger.errorNotify(msg, error, "verifyAppBinary");
    return false;
  }
}
