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
import { LocDictionary } from "./localizationDictionary";

const locDic = new LocDictionary("idfConfiguration");

export function addWinIfRequired(param: string) {
    const winFlag = process.platform === "win32" ? "Win" : "";
    if (param === "idf.baudRate" || param === "idf.projectName") {
        return param;
    } else {
        return param + winFlag;
    }
}

export function readParameter(param: string, workspaceUri: vscode.Uri) {
    const paramUpdated = addWinIfRequired(param);
    const paramValue = vscode.workspace.getConfiguration("", workspaceUri).get(paramUpdated);
    if (paramValue === undefined) {
        return "";
    }
    const paramValueString = paramValue.toString();
    return resolveVariables(paramValueString, workspaceUri);
}

export function writeParameter(param: string, newValue: string, workspaceUri: vscode.Uri) {
    const paramValue = addWinIfRequired(param);
    const configuration = vscode.workspace.getConfiguration("", workspaceUri);
    configuration.update(paramValue, newValue, vscode.ConfigurationTarget.WorkspaceFolder);
}

export function updateConfParameter(confParamName, confParamDescription,
                                    currentValue, label, workspaceUri: vscode.Uri) {
    vscode.window.showInputBox({ placeHolder: confParamDescription, value: currentValue}).then((newValue) => {
        return new Promise((resolve, reject) => {
            if (newValue !== undefined || newValue !== "") {
                    writeParameter(confParamName, newValue, workspaceUri);
                    const updateMessage = locDic.localize("idfConfiguration.hasBeenUpdated", " has been updated");
                    vscode.window.showInformationMessage(label + updateMessage);
                    resolve(newValue);
                } else {
                    reject(newValue);
                }
        });
    });
}

export function resolveVariables(configPath: string, workspaceUri: vscode.Uri) {
    const regexp = /\$\{(.*?)\}/g; // Find ${anything}
    return configPath.replace(regexp, (match: string, name: string) => {
        if (match.indexOf("config:") > 0) {
            const configVar = name.substring(name.indexOf("config:") + "config:".length);
            const configVarValue = readParameter(configVar, workspaceUri);
            return resolveVariables(configVarValue, workspaceUri);
        }
        if (match.indexOf("env:") > 0) {
            const envVariable = name.substring(name.indexOf("env:") + "env:".length);
            const pathInEnv = process.env[envVariable];
            return pathInEnv;
        }
        return match;
    });
}
