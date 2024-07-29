/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 14th June 2024 7:59:17 am
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
import { OutputChannel } from "../../logger/outputChannel";
import { appendIdfAndToolsToPath, execChildProcess } from "../../utils";
import { getVirtualEnvPythonPath } from "../../pythonManager";

export async function installWebsocketClient(workspace: Uri) {
  const pythonBinPath = await getVirtualEnvPythonPath(workspace);
  const modifiedEnv = await appendIdfAndToolsToPath(workspace);
  try {
    const showResult = await execChildProcess(
      pythonBinPath,
      ["-m", "pip", "show", "websocket_client"],
      workspace.fsPath,
      OutputChannel.init(),
      { env: modifiedEnv }
    );
    OutputChannel.appendLine(showResult);
  } catch (error) {
    OutputChannel.appendLine(
      "Installing the websocket_client package for IDE integration!"
    );
    const installResult = await execChildProcess(
      pythonBinPath,
      [
        "-m",
        "pip",
        "install",
        "websocket_client",
        "--extra-index-url",
        "https://dl.espressif.com/pypi",
      ],
      workspace.fsPath,
      OutputChannel.init(),
      { env: modifiedEnv }
    );
    OutputChannel.appendLine(installResult);
  }
}
