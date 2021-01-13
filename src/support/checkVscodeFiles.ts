/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 13th January 2021 3:22:57 pm
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

import { reportObj } from "./types";
import { Uri } from "vscode";
import { join } from "path";
import { readFile } from "fs-extra";

export async function checkLaunchJson(
  reportedResult: reportObj,
  currentWorkspace: Uri
) {
  if (!currentWorkspace) {
    return;
  }
  const launchJsonPath = join(
    currentWorkspace.fsPath,
    ".vscode",
    "launch.json"
  );
  const launchJsonObj = await readFile(launchJsonPath, "utf8");
  reportedResult.launchJson = launchJsonObj;
}

export async function checkCCppPropertiesJson(
  reportedResult: reportObj,
  currentWorkspace: Uri
) {
  if (!currentWorkspace) {
    return;
  }
  const cCppPropertiesJsonPath = join(
    currentWorkspace.fsPath,
    ".vscode",
    "c_cpp_properties.json"
  );
  const cCppPropertiesObj = await readFile(cCppPropertiesJsonPath, "utf8");
  reportedResult.cCppPropertiesJson = cCppPropertiesObj;
}
