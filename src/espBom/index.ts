/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 9th January 2024 3:40:14 pm
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

import { Uri } from "vscode";
import { appendIdfAndToolsToPath, execChildProcess } from "../utils";
import { readParameter } from "../idfConfiguration";
import { OutputChannel } from "../logger/outputChannel";

export async function createSBOM(workspace: Uri) {}

export async function checkVulnerabilities(workspace: Uri) {}

export async function installEspSBOM(workspace: Uri) {
  const pythonBinPath = readParameter("idf.pythonBinPath", workspace) as string;
  const modifiedEnv = appendIdfAndToolsToPath(workspace);
  try {
    const result = await execChildProcess(
      `"${pythonBinPath}" -m pip show esp-idf-sbom`,
      workspace.fsPath,
      OutputChannel.init(),
      { env: modifiedEnv }
    );
    return result.indexOf("WARNING: Package(s) not found: esp-idf-sbom") === -1;
  } catch (error) {
    const installResult = await execChildProcess(
      `"${pythonBinPath}" -m pip install esp-idf-sbom`,
      workspace.fsPath,
      OutputChannel.init(),
      { env: modifiedEnv }
    );
  }
}
