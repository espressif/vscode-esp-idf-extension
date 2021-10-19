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

import * as path from "path";
import * as vscode from "vscode";
import { IdfToolsManager } from "../idfToolsManager";
import { SetupPanel } from "./SetupPanel";
import { downloadEspIdfTools } from "./toolInstall";
import { IdfMirror, StatusType } from "../views/setup/types";
import { createPyReqs } from "./pyReqsInstallStep";

export async function downloadIdfTools(
  idfPath: string,
  toolsPath: string,
  pyPath: string,
  gitPath: string,
  mirror: IdfMirror,
  progress?: vscode.Progress<{ message: string; increment?: number }>,
  cancelToken?: vscode.CancellationToken,
  onReqPkgs?: string[]
) {
  const idfToolsManager = await IdfToolsManager.createIdfToolsManager(
    idfPath,
    gitPath
  );
  const exportPaths = await idfToolsManager.exportPathsInString(
    path.join(toolsPath, "tools"),
    onReqPkgs
  );
  const exportVars = await idfToolsManager.exportVars(
    path.join(toolsPath, "tools"),
    onReqPkgs
  );
  const requiredTools = await idfToolsManager.getRequiredToolsInfo(
    toolsPath,
    exportPaths,
    onReqPkgs
  );
  SetupPanel.postMessage({
    command: "setRequiredToolsInfo",
    toolsInfo: requiredTools,
  });
  await downloadEspIdfTools(toolsPath, idfToolsManager, mirror, progress, cancelToken, onReqPkgs);
  SetupPanel.postMessage({
    command: "updateEspIdfToolsStatus",
    status: StatusType.installed,
  });
  await createPyReqs(
    idfPath,
    toolsPath,
    pyPath,
    exportPaths,
    exportVars,
    gitPath,
    progress,
    cancelToken
  );
}
