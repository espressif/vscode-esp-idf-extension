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
import { Logger } from "./logger/logger";

const locDic = new LocDictionary(__filename);

const platformDepConfigurations: string[] = [
    "idf.espIdfPath",
    "idf.pythonBinPath",
    "idf.pythonSystemBinPath",
    "idf.port",
    "idf.deviceInterface",
    "idf.board",
    "idf.toolsPath",
];

export function addWinIfRequired(param: string) {
    const winFlag = process.platform === "win32" ? "Win" : "";

    for (const platDepConf of platformDepConfigurations) {
        if (param.indexOf(platDepConf) >= 0) {
            return param + winFlag;
        }
    }
    return param;
}

export function readParameter(param: string) {
    const paramUpdated = addWinIfRequired(param);
    const paramValue = vscode.workspace.getConfiguration("").get(paramUpdated);
    if (typeof paramValue === "undefined") {
        return "";
    }
    if (typeof paramValue === "string") {
        return resolveVariables(paramValue);
    }
    return paramValue;
}

export function writeParameter(param: string, newValue) {
    const paramValue = addWinIfRequired(param);
    const configuration = vscode.workspace.getConfiguration();
    configuration.update(paramValue, newValue, vscode.ConfigurationTarget.Global);
}

export function updateConfParameter(confParamName, confParamDescription,
                                    currentValue, label) {
    vscode.window.showInputBox({ placeHolder: confParamDescription, value: currentValue}).then((newValue) => {
        return new Promise((resolve, reject) => {
            if (newValue) {
                const typeOfConfig = checkTypeOfConfiguration(confParamName);
                let valueToWrite;
                if (typeOfConfig === "array") {
                    valueToWrite = parseStrToArray(newValue);
                } else {
                    valueToWrite = newValue;
                }
                writeParameter(confParamName, valueToWrite);
                const updateMessage = locDic.localize("idfConfiguration.hasBeenUpdated", " has been updated");
                Logger.infoNotify(label + updateMessage);
                resolve(newValue);
            } else {
                reject(newValue);
            }
        });
    });
}

export function checkTypeOfConfiguration(paramName: string) {
    const conf = vscode.workspace.getConfiguration("");
    const { defaultValue } = conf.inspect(paramName);
    if (typeof defaultValue === "object") {
        return Array.isArray(defaultValue) ? "array" : "object";
    } else {
        return typeof defaultValue;
    }
}

export function parseStrToArray(groupStr: string) {
    const initialArray = groupStr.split(",");
    const resultArr = [];
    for (const el of initialArray) {
        if (el.trim() !== "") {
            resultArr.push(el.trim());
        }
    }
    return resultArr;
}

export function resolveVariables(configPath: string) {
    const regexp = /\$\{(.*?)\}/g; // Find ${anything}
    return configPath.replace(regexp, (match: string, name: string) => {
        if (match.indexOf("config:") > 0) {
            const configVar = name.substring(name.indexOf("config:") + "config:".length);
            const configVarValue = readParameter(configVar);
            return resolveVariables(configVarValue);
        }
        if (match.indexOf("env:") > 0) {
            const envVariable = name.substring(name.indexOf("env:") + "env:".length);
            const pathInEnv = process.env[envVariable];
            return pathInEnv;
        }
        if (match.indexOf("workspaceFolder") > 0) {
            return vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0 ?
                vscode.workspace.workspaceFolders[0].uri.fsPath : "";
        }
        return match;
    });
}
