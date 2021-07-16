/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 16th July 2021 4:23:24 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { join } from "path";
import { createFlashModel } from "../../flash/flashModelBuilder";
import { readParameter } from "../../idfConfiguration";
import { Logger } from "../../logger/logger";
import { appendIdfAndToolsToPath, spawn } from "../../utils";

export async function verifyAppBinary(workspaceFolder: string) {
  const modifiedEnv = appendIdfAndToolsToPath();
  const serialPort = readParameter("idf.port");
  const flashBaudRate = readParameter("idf.flashBaudRate");
  const flasherArgsJsonPath = join(
    workspaceFolder,
    "build",
    "flasher_args.json"
  );
  const model = await createFlashModel(
    flasherArgsJsonPath,
    serialPort,
    flashBaudRate
  );

  try {
    const cmdResult = await spawn(
      "esptool.py",
      [
        "-p",
        serialPort,
        "verify_flash",
        model.app.address,
        `build/${model.app.binFilePath}`,
      ],
      {
        cwd: workspaceFolder,
        env: modifiedEnv,
      }
    );
    console.log(cmdResult);
    if (cmdResult.indexOf("verify FAILED (digest mismatch)") !== -1) {
      return false;
    } else if (cmdResult.indexOf("verify OK (digest matched)") !== -1) {
      return true;
    }
    return false;
  } catch (error) {
    if (
      error &&
      error.error &&
      error.error.message &&
      error.error.message.indexOf("verify FAILED (digest mismatch)") !== -1
    ) {
      return false;
    }
    const msg = error.error.message
      ? error.error.message
      : error.message
      ? error.message
      : "Something wrong while verifying app binary.";
    Logger.errorNotify(msg, error);
    return false;
  }
}
