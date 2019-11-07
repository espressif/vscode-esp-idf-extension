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

import * as childProcess from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { IdfComponent } from "./idfComponent";
import { LocDictionary } from "./localizationDictionary";
import { Logger } from "./logger/logger";
const extensionName = __dirname.replace(path.sep + "out", "");
const templateDir = path.join(extensionName, "templates");
const locDic = new LocDictionary(__filename);
const currentFolderMsg = locDic.localize("utils.currentFolder", "ESP-IDF Current Project");

export class PreCheck {
    public static perform(preCheckFn: () => boolean, failureMessage: string, proceed: () => any): any {
        if (preCheckFn()) {
            return proceed();
        }
        Logger.errorNotify(failureMessage, new Error("PRECHECK_FAILED"));
    }
    public static isWorkspaceFolderOpen(): boolean {
        return vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0;
    }
}

export function spawn(command: string, args: string[] = [], options: any = {}): Promise<Buffer> {
    let buff = Buffer.alloc(0);
    const sendToOutputChannel = (data: Buffer) => {
        buff = Buffer.concat([buff, data]);
    };
    return new Promise((resolve, reject) => {
        options.cwd = options.cwd || path.resolve(path.join(__dirname, ".."));
        const child = childProcess.spawn(command, args, options);

        child.stdout.on("data", sendToOutputChannel);
        child.stderr.on("data", sendToOutputChannel);

        child.on("error", (error) => reject({ error }));

        child.on("exit", (code) => {
            if (code === 0) {
                resolve(buff);
            } else {
                reject({ error : new Error("non zero exit code " + code) });
            }
        });
    });
}

export function canAccessFile(filePath: string): boolean {
    try {
        // tslint:disable-next-line: no-bitwise
        fs.accessSync(filePath, fs.constants.R_OK | fs.constants.W_OK | fs.constants.X_OK);
        return true;
    } catch (error) {
        Logger.error(`Cannot access filePath: ${filePath}`, error);
        return false;
    }
}

export async function sleep(ms: number): Promise<any> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

export function updateStatus(
    status: vscode.StatusBarItem,
    info: {
        currentWorkSpace: string,
        tooltip: string,
        clickCommand: string,
    }): void {
        status.text = info ? `$(file-submodule)` : void 0;
        status.tooltip = info ? `${currentFolderMsg}: ${info.tooltip}` : void 0;
        status.command = info ? info.clickCommand : void 0;

        if (info) {
            status.show();
        } else {
            status.hide();
        }
}

export function copyTarget(source, target) {
    const readStream = fs.createReadStream(source);
    const writeStream = fs.createWriteStream(target);

    return new Promise((resolve, reject) => {
        readStream.on("error", reject);
        writeStream.on("error", reject);
        writeStream.on("finish", resolve);
        readStream.pipe(writeStream);
    }).catch((error) => {
        Logger.errorNotify(error.message, error);
        readStream.destroy();
        writeStream.close();
    });
}

export function createVscodeFolder(curWorkspaceFsPath: string) {
    const settingsDir = path.join(curWorkspaceFsPath, ".vscode");
    const vscodeTemplateFolder = path.join(templateDir, ".vscode");

    fs.mkdir(settingsDir, (err) => {
        if (err && err.code !== "EEXIST") {
            Logger.errorNotify(err.message, err);
        }
    });
    fs.readdir(vscodeTemplateFolder, (error, files) => {
        if (error) {
            Logger.errorNotify(error.message, error);
            return;
        }
        files.forEach((file) => {
            copyTarget(path.join(vscodeTemplateFolder, file), path.join(settingsDir, file));
        });
    });
}

export function chooseTemplateDir() {
    const templatesAvailable = fs.readdirSync(templateDir).filter((file) => {
        return fs.statSync(path.join(templateDir, file)).isDirectory() && file !== ".vscode";
      });
    const templates = [];
    templatesAvailable.forEach((templDir) => {
        templates.push({ label: templDir, target: templDir });
    });
    return templates;
}

export function getDirectories(dirPath) {
    return fs.readdirSync(dirPath).filter((file) => {
      return fs.statSync(path.join(dirPath, file)).isDirectory();
    });
  }

export function createSkeleton(curWorkspaceFsPath: string, chosenTemplateDir: string) {
        const templateDirToUse = path.join(templateDir, chosenTemplateDir);
        createVscodeFolder(curWorkspaceFsPath);
        const dirs = getDirectories(templateDirToUse);

        dirs.forEach((dir) => {
            const curDir = path.join(curWorkspaceFsPath, dir);
            const curTemplateDir = path.join(templateDirToUse, dir);
            fs.mkdir(curDir, (err) => {
                if (err && err.code !== "EEXIST") {
                    Logger.errorNotify(err.message, err);
                }
            });
            fs.readdir(curTemplateDir, (err, files) => {
                if (err) {
                    Logger.errorNotify(err.message, err);
                    return;
                }
                files.forEach((file) => {
                    copyTarget(path.join(curTemplateDir, file), path.join(curDir, file));
                });
            });
        });

        fs.readdir(templateDirToUse, (error, files) => {
            if (error) {
                Logger.errorNotify(error.message, error);
                return;
            }
            files.forEach((file) => {
                if (dirs.indexOf(file) === -1) {
                    copyTarget(path.join(templateDirToUse, file), path.join(curWorkspaceFsPath, file));
                }
            });
        });
}

export function delConfigFile(workspaceRoot) {
    const sdkconfigFile = path.join(workspaceRoot.fsPath, "sdkconfig");
    fs.unlinkSync(sdkconfigFile);
}

export function delTmpConfigFile(givenPath) {
    const sdkconfigFile = path.join(givenPath, "sdkconfig.tmp");
    fs.unlinkSync(sdkconfigFile);
}

export function fileExists(filePath) {
    return fs.existsSync(filePath);
}

export function readFileSync(filePath) {
    return fs.readFileSync(filePath, "utf-8");
}

export function readDirSync(filePath): IdfComponent[] {
    const filesOrFolders: IdfComponent[] = [];

    const files = fs.readdirSync(filePath);

    const openComponentMsg = locDic.localize("utils.openComponentTitle", "Open IDF component file");

    for (const file of files) {
        const stats = fs.statSync(path.join(filePath, file));
        const isCollapsable: vscode.TreeItemCollapsibleState = stats.isDirectory() ? 1 : 0;
        const idfCommand = stats.isDirectory() ? void 0 : {
            arguments: [vscode.Uri.file(path.join(filePath, file))],
            command: "espIdf.openIdfDocument",
            title: openComponentMsg,
        };
        const component = new IdfComponent(
            file,
            isCollapsable,
            vscode.Uri.file(path.join(filePath, file)),
            idfCommand,
        );
        filesOrFolders.push(component);
    }

    return filesOrFolders;
}

export function isJson(jsonString: string) {
    try {
        JSON.parse(jsonString);
    } catch (error) {
        return false;
    }
    return true;
}

export function isStringNotEmpty(str: string) {
    // Check if there is at least 1 alphanumeric character in the string.
    return !!str.trim();
}
