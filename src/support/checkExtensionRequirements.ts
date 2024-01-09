/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 30th December 2020 4:47:28 pm
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
import { join } from "path";
import * as vscode from "vscode";
import { reportObj } from "./types";
import { checkRequirements } from "./checkEspIdfRequirements";

export async function checkDebugAdapterRequirements(
  reportedResult: reportObj,
  context: vscode.ExtensionContext
) {
  try {
    const requirementsPath = join(
      context.extensionPath,
      "esp_debug_adapter",
      "requirements.txt"
    );
    const result = await checkRequirements(
      context,
      reportedResult,
      requirementsPath
    );
    reportedResult.debugAdapterRequirements.output = result;
    reportedResult.debugAdapterRequirements.result = result;
  } catch (error) {
    reportedResult.debugAdapterRequirements.result = "Error";
    reportedResult.latestError = error;
  }
}
