/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 27th February 2023 7:13:29 pm
 * Copyright 2023 Espressif Systems (Shanghai) CO LTD
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

import { pathExists } from "fs-extra";
import { join } from "path";
import { startPythonReqsProcess } from "../../utils";

export async function checkPyVenv(pyVenvPath: string, espIdfPath: string) {
  const pyExists = await pathExists(pyVenvPath);
  if (!pyExists) {
    return false;
  }
  let requirements: string;
  requirements = join(
    espIdfPath,
    "tools",
    "requirements",
    "requirements.core.txt"
  );
  const coreRequirementsExists = await pathExists(requirements);
  if (!coreRequirementsExists) {
    requirements = join(espIdfPath, "requirements.txt");
    const requirementsExists = await pathExists(requirements);
    if (!requirementsExists) {
      return false;
    }
  }
  const reqsResults = await startPythonReqsProcess(
    pyVenvPath,
    espIdfPath,
    requirements
  );
  if (reqsResults.indexOf("are not satisfied") > -1) {
    return false;
  }
  return true;
}
