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
import { ConfserverProcess } from "./espIdf/menuconfig/confServerProcess";
import { IdfTreeDataProvider } from "./idfComponentsDataProvider";
import * as idfConf from "./idfConfiguration";
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

export function getProjectName(workspace: string): Promise<string> {
    const cmakeListFile = path.join(workspace, "CMakeLists.txt");
    return new Promise((resolve, reject) => {
        try {
            if (!utils.fileExists(cmakeListFile)) {
                reject(`${cmakeListFile} doesn't exist.`);
            }
            fs.readFile(cmakeListFile, (err, data) => {
                if (err) {
                    Logger.errorNotify(err.message, err);
                    reject(err);
                }
                const content = data.toString();
                const projectMatches = content.match(/(?:project\()(.*?)(?:\))/);
                if (projectMatches && projectMatches.length > 0) {
                    resolve(projectMatches[1]);
                }
            });
        } catch (error) {
            Logger.errorNotify(error.message, error);
            reject(error);
        }
    });
}
