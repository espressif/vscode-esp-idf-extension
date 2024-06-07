/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 30th December 2020 4:45:23 pm
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
import { pathExists } from "fs-extra";
import { join } from "path";
import * as vscode from "vscode";
import { execChildProcess } from "./execChildProcess";
import { reportObj } from "./types";

export async function checkEspIdfRequirements(
  reportedResult: reportObj,
  context: vscode.ExtensionContext
) {
  try {
    let requirementsPath: string;
    requirementsPath = join(reportedResult.configurationSettings.espIdfPath, "tools", "requirements", "requirements.core.txt");
    const coreRequirementsExists = await pathExists(requirementsPath);
    if (!coreRequirementsExists) {
      requirementsPath = join(reportedResult.configurationSettings.espIdfPath, "requirements.txt");
      const requirementsExists = await pathExists(requirementsPath);
      if (!requirementsExists) {
        throw new Error("Requirements doesn't exists.");
      }
    }
    const result = await checkRequirements(
      context,
      reportedResult,
      requirementsPath
    );
    reportedResult.idfCheckRequirements.output = result;
    reportedResult.idfCheckRequirements.result = result;
  } catch (error) {
    reportedResult.idfCheckRequirements.result = "Error";
    reportedResult.latestError = error;
  }
}

export async function checkRequirements(
  context: vscode.ExtensionContext,
  reportedResult: reportObj,
  requirementsPath: string
) {
  const checkPythonDepsScript = join(
    reportedResult.configurationSettings.espIdfPath,
    "tools",
    "check_python_dependencies.py"
  );
  const modifiedEnv: { [key: string]: string } = <{ [key: string]: string }>(
    Object.assign({}, process.env)
  );
  modifiedEnv.IDF_PATH = reportedResult.configurationSettings.espIdfPath;
  const requirementsResult = await execChildProcess(
    reportedResult.configurationSettings.pythonBinPath,
    [checkPythonDepsScript, "-r", requirementsPath],
    context.extensionPath,
    { env: modifiedEnv, cwd: context.extensionPath }
  );
  return requirementsResult.trim();
}
