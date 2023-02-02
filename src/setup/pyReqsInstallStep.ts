// Copyright 2019 Espressif Systems (Shanghai) CO LTD
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as vscode from "vscode";
import { StatusType } from "../views/setup/types";
import { installPyReqs } from "./installPyReqs";
import { SetupPanel } from "./SetupPanel";
import { saveSettings } from "./setupInit";
import { getEspIdfVersion } from "../utils";
import { addIdfPath } from "./espIdfJson";
import { getOpenOcdRules } from "./addOpenOcdRules";

export async function createPyReqs(
  idfPath: string,
  toolsPath: string,
  pyPath: string,
  exportPaths: string,
  exportVars: { [key: string]: string },
  gitPath: string,
  progress: vscode.Progress<{ message: string; increment?: number }>,
  cancelToken: vscode.CancellationToken
) {
  SetupPanel.postMessage({
    command: "updatePyVEnvStatus",
    status: StatusType.started,
  });
  const virtualEnvPath = await installPyReqs(
    idfPath,
    toolsPath,
    pyPath,
    gitPath,
    progress,
    cancelToken
  );
  await saveSettings(
    idfPath,
    virtualEnvPath,
    exportPaths,
    exportVars,
    toolsPath,
    gitPath
  );
  let idfPathVersion = await getEspIdfVersion(idfPath, gitPath);
  await addIdfPath(idfPath, virtualEnvPath, idfPathVersion, toolsPath, gitPath);
  SetupPanel.postMessage({
    command: "updatePyVEnvStatus",
    status: StatusType.installed,
  });
  SetupPanel.postMessage({
    command: "setIsInstalled",
    isInstalled: true,
  });
  SetupPanel.postMessage({
    command: "setIsIdfInstalling",
    installing: false,
  });
  await getOpenOcdRules(vscode.Uri.file(idfPath));
}
