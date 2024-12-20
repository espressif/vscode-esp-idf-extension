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
import { EOL } from "os";
import { join } from "path";
import { Uri } from "vscode";
import { readParameter } from "../../idfConfiguration";
import { appendIdfAndToolsToPath, spawn } from "../../utils";
import { getVirtualEnvPythonPath } from "../../pythonManager";

export interface IdfTarget {
  label: string;
  isPreview: boolean;
  target: string;
}

export async function getTargetsFromEspIdf(workspaceFolder: Uri) {
  const modifiedEnv = await appendIdfAndToolsToPath(workspaceFolder);
  const idfPyPath = join(modifiedEnv["IDF_PATH"], "tools", "idf.py");
  const pythonBinPath = await getVirtualEnvPythonPath(workspaceFolder);
  const resultTargetArray: IdfTarget[] = [];

  const listTargetsResult = await spawn(
    pythonBinPath,
    [idfPyPath, "--list-targets"],
    {
      cwd: workspaceFolder.fsPath,
      env: modifiedEnv,
    },
    undefined,
    true
  );
  const listTargetsArray = listTargetsResult.toString().trim().split(EOL);

  for (const supportedTarget of listTargetsArray) {
    resultTargetArray.push({
      label: supportedTarget,
      target: supportedTarget,
      isPreview: false,
    } as IdfTarget);
  }

  const listTargetsWithPreviewResult = await spawn(
    pythonBinPath,
    [idfPyPath, "--preview", "--list-targets"],
    {
      cwd: workspaceFolder.fsPath,
      env: modifiedEnv,
    },
    undefined,
    true
  );
  const listTargetsWithPreviewArray = listTargetsWithPreviewResult
    .toString()
    .trim()
    .split(EOL);

  const previewTargets = listTargetsWithPreviewArray.filter(
    (t) => listTargetsArray.indexOf(t) === -1
  );

  for (const supportedTarget of previewTargets) {
    resultTargetArray.push({
      label: supportedTarget,
      target: supportedTarget,
      isPreview: true,
    } as IdfTarget);
  }
  return resultTargetArray;
}
