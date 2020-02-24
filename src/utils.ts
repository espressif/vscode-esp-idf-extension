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
import * as crypto from "crypto";
import * as fs from "fs";
import { copy, pathExists } from "fs-extra";
import * as HttpsProxyAgent from "https-proxy-agent";
import { EOL } from "os";
import * as path from "path";
import * as url from "url";
import * as vscode from "vscode";
import { IdfComponent } from "./idfComponent";
import * as idfConf from "./idfConfiguration";
import { LocDictionary } from "./localizationDictionary";
import { Logger } from "./logger/logger";

const extensionName = __dirname.replace(path.sep + "dist", "");
const templateDir = path.join(extensionName, "templates");
const locDic = new LocDictionary(__filename);
const currentFolderMsg = locDic.localize("utils.currentFolder", "ESP-IDF Current Project");

export let extensionContext: vscode.ExtensionContext;
export function setExtensionContext(context: vscode.ExtensionContext): void {
    extensionContext = context;
}

export const packageJson = vscode.extensions.getExtension("espressif.esp-idf-extension").packageJSON;

type PreCheckFunc = (...args: any[]) => boolean;
export type PreCheckInput = [PreCheckFunc, string];
export class PreCheck {
    public static perform(preCheckFunctions: PreCheckInput[], proceed: () => any): any {
        let isPassedAll: boolean = true;
        preCheckFunctions.forEach((preCheck: PreCheckInput) => {
            if (!preCheck[0]()) {
                isPassedAll = false;
                Logger.errorNotify(preCheck[1], new Error("PRECHECK_FAILED"));
            }
        });
        if (isPassedAll) {
            return proceed();
        }
    }
    public static isWorkspaceFolderOpen(): boolean {
        return vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0;
    }
    public static notUsingWebIde(): boolean {
        return process.env.WEB_IDE ? false : true;
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

        child.on("error", (error) => reject({ error}));

        child.on("exit", (code) => {
            if (code === 0) {
                resolve(buff);
            } else {
                const msg = "non zero exit code " + code + EOL + EOL + buff;
                Logger.error(msg, new Error(msg));
                reject({ error : new Error("non zero exit code " + code + "\n\n" + buff) });
            }
        });
    });
}

export function canAccessFile(filePath: string, mode?: number): boolean {
    try {
        // tslint:disable-next-line: no-bitwise
        mode = mode || fs.constants.R_OK | fs.constants.W_OK | fs.constants.X_OK;
        fs.accessSync(filePath, mode);
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

export function createVscodeFolder(curWorkspaceFsPath: string) {
    const settingsDir = path.join(curWorkspaceFsPath, ".vscode");
    const vscodeTemplateFolder = path.join(templateDir, ".vscode");
    copy(vscodeTemplateFolder, settingsDir);
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

export function createSkeleton(curWorkspacePath: string, chosenTemplateDir: string) {
    const templateDirToUse = path.join(templateDir, chosenTemplateDir);
    copyFromSrcProject(templateDirToUse, curWorkspacePath);
}

export function copyFromSrcProject(srcDirPath: string, destinationDir: string) {
    createVscodeFolder(destinationDir);
    copy(srcDirPath, destinationDir).catch((err) => {
        Logger.errorNotify(err, err);
    });
}

export function delConfigFile(workspaceRoot: vscode.Uri) {
    const sdkconfigFile = path.join(workspaceRoot.fsPath, "sdkconfig");
    fs.unlinkSync(sdkconfigFile);
}

export function fileExists(filePath) {
    return fs.existsSync(filePath);
}

export function readFileSync(filePath) {
    return fs.readFileSync(filePath, "utf-8");
}

export function readComponentsDirs(filePath): IdfComponent[] {
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

export function execChildProcess(
    processStr: string,
    workingDirectory: string,
    channel?: vscode.OutputChannel,
    opts?: childProcess.ExecOptions): Promise<string> {
    const execOpts: childProcess.ExecOptions = opts ? opts : {
        cwd: workingDirectory,
        maxBuffer: 500 * 1024,
    };
    return new Promise<string>((resolve, reject) => {
        childProcess.exec(processStr,
            execOpts,
            (error: Error, stdout: string, stderr: string) => {
            if (channel) {
                let message: string = "";
                let err: boolean = false;
                if (stdout && stdout.length > 0) {
                    message += stdout;
                }
                if (stderr && stderr.length > 0) {
                    message += stderr;
                    err = true;
                    if (stderr.indexOf("Licensed under GNU GPL v2") !== -1 && stderr.indexOf("DEPRECATION") !== -1) {
                        err = false;
                    }
                }
                if (error) {
                    message += error.message;
                    err = true;
                }
                if (err) {
                    channel.append(message);
                    channel.show();
                }
            }

            if (error) {
                if (error.message) {
                    Logger.error(error.message, error);
                }
                reject(error);
                return;
            }
            if (stderr && stderr.length > 2) {
                Logger.error(stderr, new Error(stderr));
                if (stderr.indexOf("Licensed under GNU GPL v2") !== -1) {
                    resolve(stderr);
                }
                if (stderr.indexOf("DEPRECATION") !== -1) {
                    resolve(stdout.concat(stderr));
                }
                if (stderr.indexOf("WARNING") !== -1) {
                    resolve(stdout.concat(stderr));
                }
                if (stderr.indexOf("Cache entry deserialization failed") !== -1) {
                    resolve(stdout.concat(stderr));
                }
                if (stderr.trim().endsWith("pip install --upgrade pip' command.")) {
                    resolve(stdout.concat(stderr));
                }
                reject(new Error(stderr));
                return;
            }
            resolve(stdout);
        });
    });
}

export function getToolPackagesPath(toolPackage: string[]) {
    const idfToolsPath = idfConf.readParameter("idf.toolsPath");
    return path.resolve(idfToolsPath, ...toolPackage);
}

export async function getToolsJsonPath(newIdfPath: string) {
    const espIdfVersion = await getEspIdfVersion(newIdfPath);
    let jsonToUse: string = path.join(newIdfPath, "tools", "tools.json");
    await pathExists(jsonToUse).then((exists) => {
        if (!exists) {
            const idfToolsJsonToUse = espIdfVersion.localeCompare("4.0") < 0 ? "fallback-tools.json" : "tools.json";
            jsonToUse = path.join(extensionContext.extensionPath, idfToolsJsonToUse);
        }
    });
    return jsonToUse;
}

export function getHttpsProxyAgent(): HttpsProxyAgent {
    let proxy: string = vscode.workspace.getConfiguration().get("http.proxy");
    if (!proxy) {
        proxy = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
        if (!proxy) {
            return null;
        }
    }

    const proxyUrl: any = url.parse(proxy);
    if (proxyUrl.protocol !== "https:" && proxyUrl.protocol !== "http:") {
        return null;
    }

    const strictProxy: any = vscode.workspace.getConfiguration().get("http.proxyStrictSSL", true);
    const proxyOptions: any = {
        auth: proxyUrl.auth,
        host: proxyUrl.hostname,
        port: parseInt(proxyUrl.port, 10),
        rejectUnauthorized: strictProxy,
    };
    return new HttpsProxyAgent(proxyOptions);

}

export function readDirPromise(dirPath) {
    return new Promise<string[]>((resolve, reject) => {
        fs.readdir(dirPath, (err, files) => {
            if (err) {
                reject(err);
            }
            resolve(files);
        });
    });
}

export function dirExistPromise(dirPath) {
    return new Promise<boolean>((resolve, reject ) => {
        fs.stat(dirPath, (err, stats) => {
            if (err) {
                resolve(false);
            } else {
                if (stats.isDirectory()) {
                    resolve(true);
                }
                resolve(false);
            }
        });
    });
}

export function isStringNotEmpty(str: string) {
    // Check if there is at least 1 alphanumeric character in the string.
    return !!str.trim();
}

export function checkIsProjectCmakeLists(dir: string) {
    // Check if folder contain CMakeLists.txt with project(name) call.
    const cmakeListFile = path.join(dir, "CMakeLists.txt");
    if (fileExists(cmakeListFile)) {
        const content = fs.readFileSync(cmakeListFile, "utf-8");
        const projectMatches = content.match(/(project\(.*?\))/g);
        if ( projectMatches && projectMatches.length > 0) {
            return true;
        }
    }
    return false;
}

export function getSubProjects(dir: string): string[] {
    const subDirs = getDirectories(dir);
    if (checkIsProjectCmakeLists(dir)) {
        return [dir];
    } else {
        const subProjectsPathArray = [];
        subDirs.forEach((subDir) => {
            const subProjectsPaths = getSubProjects(path.join(dir, subDir));
            subProjectsPaths.forEach((subProjPath) => {
                subProjectsPathArray.push(subProjPath);
            });
        });
        return subProjectsPathArray;
    }
}

export async function getEspIdfVersion(workingDir: string) {
    const canCheck = await checkGitExists(extensionContext.extensionPath);
    if (canCheck === "Not found") {
        Logger.errorNotify("Git is not found in current environment", Error("git is not found"));
        return "x.x";
    }
    return await execChildProcess("git describe --tags", workingDir)
    .then((rawEspIdfVersion) => {
        const espIdfVersionMatch = rawEspIdfVersion.match(/^v([0-9]+\.[0-9]+).*/);
        if (espIdfVersionMatch && espIdfVersionMatch.length < 1) {
            return "x.x";
        }
        return espIdfVersionMatch[1];
    })
    .catch((reason) => {
        return "x.x";
    });
}

export async function checkGitExists(workingDir: string) {
    return await execChildProcess("git --version", workingDir).then((result) => {
        if (result) {
            const match = result.match(/(?:git\sversion\s)(\d+)(.\d+)?(.\d+)?(?:.windows.\d+)?/g);
            if (match && match.length > 0) {
                return match[0].replace("git version ", "");
            } else {
                Logger.errorNotify("Git is not found in current environment", Error(""));
                return "Not found";
            }
        }
    }).catch((err) => {
        Logger.errorNotify("Git is not found in current environment", err);
        return "Not found";
    });
}

export function buildPromiseChain<TItem, TPromise>(
    items: TItem[],
    promiseBuilder: (TItem: TItem) => Promise<TPromise>): Promise<TPromise> {
        let promiseChain: Promise<TPromise> = Promise.resolve<TPromise>(null);
        for (const item of items) {
            promiseChain = promiseChain.then(() => {
            return promiseBuilder(item);
            });
        }
        return promiseChain;
}

export function fileNameFromUrl(urlToParse: string) {
    const matches = urlToParse.match(/\/([^\/?#]+)[^\/]*$/);
    if (matches.length > 1) {
      return matches[1];
    }
    return null;
}

export function validateFileSizeAndChecksum(filePath: string, expectedHash: string, expectedFileSize: number) {
    return new Promise<boolean>(async (resolve, reject) => {
        const algo = "sha256";
        const shashum = crypto.createHash(algo);
        await pathExists(filePath).then((doesFileExists) => {
            if (doesFileExists) {
                const fileSize = fs.statSync(filePath).size;
                const readStream = fs.createReadStream(filePath);
                let fileChecksum: string;
                readStream.on("data", (data) => {
                    shashum.update(data);
                });
                readStream.on("end", () => {
                    fileChecksum = shashum.digest("hex");
                    const isChecksumEqual = fileChecksum === expectedHash;
                    const isSizeEqual = fileSize === expectedFileSize;
                    const comparisonResult = isChecksumEqual && isSizeEqual;
                    resolve(comparisonResult);
                });
                readStream.on("error", (e) => reject(e));
            } else {
                reject(false);
            }
        });
    });
}

export function appendIdfAndToolsToPath() {
    const extraPaths = idfConf.readParameter("idf.customExtraPaths");
    if (!process.env.PATH.includes(extraPaths)) {
        process.env.PATH = extraPaths + path.delimiter + process.env.PATH;
    }

    const customVars = idfConf.readParameter("idf.customExtraVars") as string;
    if (customVars) {
        try {
            for (const envVar in JSON.parse(customVars)) {
                if (envVar) {
                    process.env[envVar] = customVars[envVar];
                }
            }
        } catch (error) {
            Logger.errorNotify("Invalid custom environment variables format", error);
        }
    }

    const idfPathDir = idfConf.readParameter("idf.espIdfPath");
    process.env.IDF_PATH = idfPathDir || process.env.IDF_PATH;

    const idfTarget = idfConf.readParameter("idf.adapterTargetName");
    process.env.IDF_TARGET = idfTarget || process.env.IDF_TARGET;

    process.env.PYTHON = idfConf.readParameter("idf.pythonBinPath") || process.env.PYTHON;

    return process.env;
}

export async function isBinInPath(binaryName: string, workDirectory: string) {
    const cmd = process.platform === "win32" ? "where" : "which";
    return await spawn(cmd, [ binaryName], { workDirectory }).then((result) => {
        if (result.toString() === "" || result.toString().indexOf("Could not find files") < 0) {
            return binaryName.localeCompare(result.toString().trim()) === 0 ? "" : result.toString().trim();
        }
        return "";
    }).catch((err) => {
        if (err) {
            Logger.error(`Cannot access filePath: ${binaryName}`, err);
        }
        return "";
    });
}
