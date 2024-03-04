/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 30th December 2020 4:03:52 pm
 * Copyright 2020 Espressif Systems (Shanghai) CO LTD
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
import { constants } from "fs-extra";
import { delimiter } from "path";
import * as vscode from "vscode";
import { canAccessFile } from "../utils";
import { execChildProcess } from "./execChildProcess";
import { reportObj } from "./types";

export async function getConfigurationAccess(
  reportedResult: reportObj,
  context: vscode.ExtensionContext
) {
  reportedResult.configurationAccess.toolsPath = canAccessFile(
    reportedResult.configurationSettings.toolsPath,
    constants.R_OK
  );
  reportedResult.configurationAccess.espAdfPath = canAccessFile(
    reportedResult.configurationSettings.espAdfPath,
    constants.R_OK
  );
  reportedResult.configurationAccess.espIdfPath = canAccessFile(
    reportedResult.configurationSettings.espIdfPath,
    constants.R_OK
  );
  reportedResult.configurationAccess.espMdfPath = canAccessFile(
    reportedResult.configurationSettings.espMdfPath,
    constants.R_OK
  );
  reportedResult.configurationAccess.espMatterPath = canAccessFile(
    reportedResult.configurationSettings.espMatterPath,
    constants.R_OK
  );
  reportedResult.configurationAccess.espHomeKitPath = canAccessFile(
    reportedResult.configurationSettings.espHomeKitPath,
    constants.R_OK
  );
  reportedResult.configurationAccess.pythonBinPath = canAccessFile(
    reportedResult.configurationSettings.pythonBinPath,
    constants.X_OK
  );
  reportedResult.configurationAccess.espIdfToolsPaths = {};
  if (
    reportedResult.configurationSettings.customExtraPaths &&
    reportedResult.configurationSettings.customExtraPaths.length
  ) {
    const toolPathsArray = reportedResult.configurationSettings.customExtraPaths.split(
      delimiter
    );
    for (const tool of toolPathsArray) {
      reportedResult.configurationAccess.espIdfToolsPaths[tool] = canAccessFile(
        tool,
        constants.R_OK
      );
    }
  }
  if (process.platform !== "win32") {
    const cmakePathInEnv = await execChildProcess(
      "which",
      ["cmake"],
      context.extensionPath
    );
    reportedResult.configurationAccess.cmakeInEnv =
      cmakePathInEnv && cmakePathInEnv.indexOf("not found") === -1;
    const ninjaPathInEnv = await execChildProcess(
      "which",
      ["ninja"],
      context.extensionPath
    );
    reportedResult.configurationAccess.ninjaInEnv =
      ninjaPathInEnv && ninjaPathInEnv.indexOf("not found") === -1;
  }
}
