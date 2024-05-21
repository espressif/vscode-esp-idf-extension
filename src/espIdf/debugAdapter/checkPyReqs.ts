/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 23rd February 2024 6:13:58 pm
 * Copyright 2024 Espressif Systems (Shanghai) CO LTD
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
import { readParameter } from "../../idfConfiguration";
import { pathExists } from "fs-extra";
import { Uri } from "vscode";
import { extensionContext, startPythonReqsProcess } from "../../utils";

export async function checkDebugAdapterRequirements(workspaceFolder: Uri) {
  const idfPath = readParameter("idf.espIdfPath", workspaceFolder);
  const pythonBinPath = readParameter("idf.pythonBinPath", workspaceFolder);
  let requirementsPath = join(
    extensionContext.extensionPath,
    "esp_debug_adapter",
    "requirements.txt"
  );
  let checkResult: string;
  try {
    const doesPyTestRequirementsExists = await pathExists(requirementsPath);
    if (!doesPyTestRequirementsExists) {
      return false;
    }
    checkResult = await startPythonReqsProcess(
      pythonBinPath,
      idfPath,
      requirementsPath
    );
  } catch (error) {
    checkResult = error && error.message ? error.message : " are not satisfied";
  }
  if (checkResult.indexOf("are satisfied") > -1) {
    return true;
  }
  return false;
}
