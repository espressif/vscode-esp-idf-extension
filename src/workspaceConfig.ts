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

import * as fs from "fs";
import { pathExists } from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import { IdfTreeDataProvider } from "./idfComponentsDataProvider";
import { writeParameter } from "./idfConfiguration";
import { Logger } from "./logger/logger";
import * as utils from "./utils";

export function initSelectedWorkspace(status: vscode.StatusBarItem) {
  const workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
  updateIdfComponentsTree(workspaceRoot);
  const workspaceFolderInfo = {
    clickCommand: "espIdf.pickAWorkspaceFolder",
    currentWorkSpace: vscode.workspace.workspaceFolders[0].name,
    tooltip: vscode.workspace.workspaceFolders[0].uri.fsPath,
    text: "${file-directory}",
  };
  utils.updateStatus(status, workspaceFolderInfo);
  return workspaceRoot;
}

let idfDataProvider: IdfTreeDataProvider;
export function updateIdfComponentsTree(workspaceFolder: vscode.Uri) {
  if (typeof idfDataProvider === "undefined") {
    idfDataProvider = new IdfTreeDataProvider(workspaceFolder);
    vscode.window.registerTreeDataProvider("idfComponents", idfDataProvider);
  }
  idfDataProvider.refresh(workspaceFolder);
}

export function getProjectName(buildDir: string): Promise<string> {
  const projDescJsonPath = path.join(buildDir, "project_description.json");
  return new Promise((resolve, reject) => {
    try {
      if (!utils.fileExists(projDescJsonPath)) {
        return reject(new Error(`${projDescJsonPath} doesn't exist.`));
      }
      fs.readFile(projDescJsonPath, (err, data) => {
        if (err) {
          Logger.error(err.message, err);
          return reject(err);
        }
        const projDescJson = JSON.parse(data.toString());
        if (
          Object.prototype.hasOwnProperty.call(projDescJson, "project_name")
        ) {
          return resolve(projDescJson.project_name);
        } else {
          return reject(
            new Error(
              `project_name field doesn't exist in ${projDescJsonPath}.`
            )
          );
        }
      });
    } catch (error) {
      const errMsg = error && error.message ? error.message : error;
      Logger.error(errMsg, error);
      return reject(error);
    }
  });
}

export async function getIdfTargetFromSdkconfig(
  workspacePath: vscode.Uri,
  statusItem: vscode.StatusBarItem
) {
  const doesSdkconfigExists = await pathExists(
    path.join(workspacePath.fsPath, "sdkconfig")
  );
  const doesSdkconfigDefaultExists = await pathExists(
    path.join(workspacePath.fsPath, "sdkconfig.defaults")
  );
  if (!doesSdkconfigExists && !doesSdkconfigDefaultExists) {
    return;
  }
  let sdkconfigToUse: string = doesSdkconfigExists
    ? "sdkconfig"
    : doesSdkconfigDefaultExists
    ? "sdkconfig.defaults"
    : "";
  if (sdkconfigToUse) {
    const idfTarget = utils
      .getConfigValueFromSDKConfig(
        "CONFIG_IDF_TARGET",
        workspacePath.fsPath,
        sdkconfigToUse
      )
      .replace(/\"/g, "");
    if (!idfTarget) {
      return;
    }
    await writeParameter(
      "idf.adapterTargetName",
      idfTarget,
      vscode.ConfigurationTarget.WorkspaceFolder,
      workspacePath
    );
    statusItem.text = "$(circuit-board) " + idfTarget;
  }
}
