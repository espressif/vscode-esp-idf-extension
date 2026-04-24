/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2025 Espressif Systems (Shanghai) CO LTD
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

import { constants } from "fs";
import { join } from "path";
import { getVirtualEnvPythonPath } from "../../../pythonManager";
import { canAccessFile } from "../../../utils";

export type EsptoolInvocation = {
  pythonPath: string;
  esptoolScriptPath: string;
};

export async function resolveEsptoolInvocation(
  idfPath: string
): Promise<EsptoolInvocation> {
  const esptoolScriptPath = join(
    idfPath,
    "components",
    "esptool_py",
    "esptool",
    "esptool.py"
  );
  if (!canAccessFile(esptoolScriptPath, constants.R_OK)) {
    throw new Error("SCRIPT_PERMISSION_ERROR");
  }
  const pythonPath = await getVirtualEnvPythonPath();
  if (!pythonPath) {
    throw new Error("Python path not found in environment");
  }
  return { pythonPath, esptoolScriptPath };
}
