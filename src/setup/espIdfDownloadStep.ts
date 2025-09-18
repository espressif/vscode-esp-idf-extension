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

import { pathExists } from "fs-extra";
import * as vscode from "vscode";
import { ESP } from "../config";
import { checkPythonExists } from "../pythonManager";
import { SetupPanel } from "./SetupPanel";
import * as utils from "../utils";
import { IEspIdfLink, SetupMode, StatusType } from "../views/setup/types";
import { downloadInstallIdfVersion } from "./espIdfDownload";
import { Logger } from "../logger/logger";
import { downloadIdfTools } from "./toolsDownloadStep";
import { join } from "path";
import { IdfToolsManager } from "../idfToolsManager";

export async function expressInstall(
  selectedIdfVersion: IEspIdfLink,
  pyPath: string,
  espIdfPath: string,
  idfContainerPath: string,
  toolsPath: string,
  mirror: ESP.IdfMirror,
  saveScope: vscode.ConfigurationTarget,
  setupMode: SetupMode,
  context: vscode.ExtensionContext,
  espIdfStatusBar: vscode.StatusBarItem,
  workspaceFolderUri: vscode.Uri,
  gitPath?: string,
  progress?: vscode.Progress<{ message: string; increment?: number }>,
  cancelToken?: vscode.CancellationToken,
  onReqPkgs?: string[]
) {
  const pyExists = pyPath === "python" ? true : await pathExists(pyPath);
  const doesPythonExists = await checkPythonExists(pyPath, __dirname);
  if (!(pyExists && doesPythonExists)) {
    const containerNotFoundMsg = `${pyPath} is not valid. (ERROR_INVALID_PYTHON)`;
    Logger.infoNotify(containerNotFoundMsg);
    throw new Error(containerNotFoundMsg);
  }
  let idfPath: string;
  if (selectedIdfVersion.filename === "manual") {
    idfPath = espIdfPath;
  } else {
    idfPath = await downloadInstallIdfVersion(
      selectedIdfVersion,
      idfContainerPath,
      mirror,
      gitPath,
      progress,
      cancelToken
    );
  }
  const idfVersion = await utils.getEspIdfFromCMake(idfPath);
  if (idfVersion === "x.x") {
    throw new Error("Invalid ESP-IDF");
  }
  SetupPanel.postMessage({
    command: "updateEspIdfFolder",
    selectedFolder: idfPath,
  });
  SetupPanel.postMessage({
    command: "updateEspIdfStatus",
    status: StatusType.installed,
  });
  SetupPanel.postMessage({
    command: "setEspIdfErrorStatus",
    errorMsg: `ESP-IDF is installed in ${idfPath}`,
  });
  SetupPanel.postMessage({
    command: "updateEspIdfToolsStatus",
    status: StatusType.started,
  });
  if (setupMode === SetupMode.advanced) {
    SetupPanel.postMessage({
      command: "updatePythonPath",
      selectedPyPath: pyPath,
    });
    const idfToolsManager = await IdfToolsManager.createIdfToolsManager(
      espIdfPath
    );
    const toolsInfo = await idfToolsManager.getRequiredToolsInfo(
      join(toolsPath, "tools"),
      undefined,
      onReqPkgs
    );
    SetupPanel.postMessage({
      command: "setRequiredToolsInfo",
      toolsInfo,
    });
    SetupPanel.postMessage({
      command: "goToCustomPage",
      installing: false,
      page: "/custom",
    });
    return;
  }
  await downloadIdfTools(
    idfPath,
    toolsPath,
    pyPath,
    gitPath,
    mirror,
    saveScope,
    workspaceFolderUri,
    context,
    espIdfStatusBar,
    progress,
    cancelToken,
    onReqPkgs
  );
}
