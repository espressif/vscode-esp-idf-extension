/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 26th July 2022 5:40:28 pm
 * Copyright 2022 Espressif Systems (Shanghai) CO LTD
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
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { Uri } from "vscode";
import { Logger } from "../../logger/logger";
import { configureEnvVariables } from "../../common/prepareEnv";

export interface IdfTarget {
  label: string;
  isPreview: boolean;
  target: string;
  description?: string;
}

export async function getTargetsFromEspIdf(
  workspaceFolder: Uri,
  givenIdfPathDir?: string
) {
  const modifiedEnv = await configureEnvVariables(workspaceFolder);
  const idfPathDir = givenIdfPathDir
    ? givenIdfPathDir
    : modifiedEnv["IDF_PATH"];
  const resultTargetArray: IdfTarget[] = [];

  try {
    const idfConstantsFile = join(
      idfPathDir,
      "tools",
      "idf_py_actions",
      "constants.py"
    );
    if (!existsSync(idfConstantsFile)) {
      throw new Error(`File not found: ${idfConstantsFile}`);
    }

    const idfConstantsFileContent = readFileSync(idfConstantsFile, "utf-8");
    function extractArray(varName: string): string[] {
      const regex = new RegExp(`${varName}\\s*=\\s*\\[([^\\]]*)\\]`, "m");
      const match = idfConstantsFileContent.match(regex);
      if (!match) return [];
      // Split by comma, remove quotes and whitespace
      return match[1]
        .split(",")
        .map((s) => s.replace(/['"\s]/g, ""))
        .filter(Boolean);
    }
    const supportedTargets = extractArray("SUPPORTED_TARGETS");
    const previewTargets = extractArray("PREVIEW_TARGETS");
    for (const supportedTarget of supportedTargets) {
      resultTargetArray.push({
        label: supportedTarget,
        target: supportedTarget,
        isPreview: false,
      } as IdfTarget);
    }

    for (const supportedTarget of previewTargets) {
      resultTargetArray.push({
        label: supportedTarget,
        target: supportedTarget,
        description: "Preview",
        isPreview: true,
      } as IdfTarget);
    }
  } catch (error) {
    Logger.errorNotify(
      `Error while getting targets from ESP-IDF: ${error}`,
      error,
      "getTargetsFromEspIdf"
    );
    return resultTargetArray;
  }
  return resultTargetArray;
}
