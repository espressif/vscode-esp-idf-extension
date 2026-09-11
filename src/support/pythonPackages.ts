/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 30th December 2020 4:11:32 pm
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

export async function getPythonPackages(
  reportedResult: reportObj,
  context: vscode.ExtensionContext
) {
  try {
    const pythonBinPath = reportedResult.configurationSettings.pythonBinPath;
    if (!pythonBinPath) {
      reportedResult.pythonPackages.output = "Python path is not configured";
      reportedResult.pythonPackages.result = "Not found";
      return;
    }
    const rawPythonPackagesList = await execChildProcess(
      pythonBinPath,
      ["-m", "pip", "list", "--format", "json"],
      context.extensionPath
    );
    reportedResult.pythonPackages.output = rawPythonPackagesList;
    reportedResult.pythonPackages.result = rawPythonPackagesList;
    const parsedPkgsListMatches = rawPythonPackagesList.match(/\[.*\]/g);
    if (parsedPkgsListMatches && parsedPkgsListMatches.length) {
      reportedResult.configurationSettings.pythonPackages = JSON.parse(
        parsedPkgsListMatches[parsedPkgsListMatches.length - 1]
      );
    }
  } catch (error) {
    reportedResult.pythonPackages.output =
      error instanceof Error ? error.message : String(error);
    reportedResult.pythonPackages.result = "Not found";
    reportedResult.latestError = error;
  }
}
