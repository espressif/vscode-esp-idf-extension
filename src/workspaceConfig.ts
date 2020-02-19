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

export function initSelectedWorkspace(status: vscode.StatusBarItem) {
    const workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
    const projDescPath = path.join(workspaceRoot.fsPath, "build", "project_description.json");
    updateIdfComponentsTree(projDescPath);
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
export function updateIdfComponentsTree(projectDescriptionPath: string) {
    if (typeof idfDataProvider === "undefined") {
        idfDataProvider = new IdfTreeDataProvider(projectDescriptionPath);
        vscode.window.registerTreeDataProvider("idfComponents", idfDataProvider);
    }
    idfDataProvider.refresh(projectDescriptionPath);
}

export function getProjectName(workspacePath: string): Promise<string> {
    const projDescJsonPath = path.join(workspacePath, "build", "project_description.json");
    return new Promise((resolve, reject) => {
        try {
            if (!utils.fileExists(projDescJsonPath)) {
                reject(new Error(`${projDescJsonPath} doesn't exist.`));
            }
            fs.readFile(projDescJsonPath, (err, data) => {
                if (err) {
                    Logger.error(err.message, err);
                    reject(err);
                }
                const projDescJson = JSON.parse(data.toString());
                if (Object.prototype.hasOwnProperty.call(projDescJson, "project_name")) {
                    resolve(projDescJson.project_name);
                } else {
                    reject(new Error(`project_name field doesn't exist in ${projDescJsonPath}.`));
                }
            });
        } catch (error) {
            Logger.error(error.message, error);
            reject(error);
        }
    });
}
