/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 30th December 2020 4:07:07 pm
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
const PYTHON_VERSION_REGEX = /Python\s\d+(.\d+)?(.\d+)?/g;

export async function getPythonVersion(
  reportedResult: reportObj,
  context: vscode.ExtensionContext
) {
  try {
    const rawPythonVersion = await execChildProcess(
      `${reportedResult.configurationSettings.pythonBinPath} --version`,
      context.extensionPath
    );
    reportedResult.pythonVersion.output = rawPythonVersion;
    const match = rawPythonVersion.match(PYTHON_VERSION_REGEX);
    if (match && match.length) {
      reportedResult.pythonVersion.result = match[0].replace(/Python\s/g, "");
    } else {
      reportedResult.pythonVersion.result = "Not found";
    }
  } catch (error) {
    reportedResult.pythonVersion.result = "Not found";
    reportedResult.latestError = error;
  }
}
