/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 30th December 2020 4:08:26 pm
 * Copyright 2020 Espressif Systems (Shanghai) CO LTD
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
import * as vscode from "vscode";
import { execChildProcess } from "./execChildProcess";
import { reportObj } from "./types";
const PIP_VERSION_REGEX = /pip\s\d+(.\d+)?(.\d+)?/g;

export async function getPipVersion(
  reportedResult: reportObj,
  context: vscode.ExtensionContext
) {
  try {
    const rawPipVersion = await execChildProcess(
      reportedResult.configurationSettings.pythonBinPath,
      ["-m", "pip", "--version"],
      context.extensionPath
    );
    reportedResult.pipVersion.output = rawPipVersion;
    const match = rawPipVersion.match(PIP_VERSION_REGEX);
    if (match && match.length) {
      reportedResult.pipVersion.result = match[0].replace(/pip\s/, "");
    }
  } catch (error) {
    reportedResult.pipVersion.result = "Not found";
    reportedResult.latestError = error;
  }
}
