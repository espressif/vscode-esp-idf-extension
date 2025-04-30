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
import * as path from "path";
import * as vscode from "vscode";
import { IdfTreeDataProvider } from "./idfComponentsDataProvider";
import { Logger } from "./logger/logger";
import * as utils from "./utils";
import { readParameter } from "./idfConfiguration";
import { showInfoNotificationWithAction } from "./logger/utils";
import { isSettingIDFTarget } from "./espIdf/setTarget";

export function initSelectedWorkspace(status?: vscode.StatusBarItem) {
  const workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
  updateIdfComponentsTree(workspaceRoot);
  const workspaceFolderInfo = {
    clickCommand: "espIdf.pickAWorkspaceFolder",
    currentWorkSpace: vscode.workspace.workspaceFolders[0].name,
    tooltip: vscode.workspace.workspaceFolders[0].uri.fsPath,
    text: "${file-directory}",
  };
  if (status) {
    utils.updateStatus(status, workspaceFolderInfo);
  }
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
          Logger.error(
            err.message,
            err,
            "workspaceConfig getProjectName readFile"
          );
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
      Logger.error(errMsg, error, "workspaceConfig getProjectName");
      return reject(error);
    }
  });
}

export async function getIdfTargetFromSdkconfig(
  workspacePath: vscode.Uri,
  statusItem?: vscode.StatusBarItem
) {
  try {
    const configIdfTarget = await utils.getConfigValueFromSDKConfig(
      "CONFIG_IDF_TARGET",
      workspacePath
    );
    let idfTarget = configIdfTarget.replace(/\"/g, "");
    const customExtraVars = readParameter(
      "idf.customExtraVars",
      workspacePath
    ) as { [key: string]: string };
    const customIdfTarget = customExtraVars["IDF_TARGET"];

    if (idfTarget && customIdfTarget && idfTarget !== customIdfTarget) {
      if (!isSettingIDFTarget) {
        showInfoNotificationWithAction(
          vscode.l10n.t(
            'IDF_TARGET mismatch: SDKConfig value is "{0}" but settings value is "{1}".',
            idfTarget,
            customIdfTarget
          ),
          vscode.l10n.t("Set IDF_TARGET"),
          () => vscode.commands.executeCommand("espIdf.setTarget")
        );
      }
    }

    if (!idfTarget) {
      idfTarget = customIdfTarget;
    }
    if (!idfTarget) {
      idfTarget = "esp32";
    }
    if (statusItem) {
      statusItem.text = "$(chip) " + idfTarget;
    }
    return idfTarget;
  } catch (error) {
    const customExtraVars = readParameter(
      "idf.customExtraVars",
      workspacePath
    ) as { [key: string]: string };
    let idfTarget = customExtraVars["IDF_TARGET"] || "esp32";
    if (statusItem) {
      statusItem.text = `$(chip) ${idfTarget}`;
    }
    return idfTarget;
  }
}
