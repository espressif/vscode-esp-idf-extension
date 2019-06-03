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

"use strict";
import { ChildProcess, spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { SerialPort } from "./espIdf/serial/serialPort";
import { IdfTreeDataProvider } from "./idfComponentsDataProvider";
import * as idfConf from "./idfConfiguration";
import { LocDictionary } from "./localizationDictionary";
import { MenuConfigPanel } from "./MenuconfigPanel";
import * as utils from "./utils";
import { PreCheck } from "./utils";

// Global variables shared by commands
let workspaceRoot: vscode.Uri;

// OpenOCD Server Process and Output Channel
let ocdServer: ChildProcess;
let openOCDChannel: vscode.OutputChannel;

// Process to execute build, debug or monitor
let idfDataProvider: IdfTreeDataProvider;
let idfChannel: vscode.OutputChannel;
let mainProcess: ChildProcess;
let monitorTerminal: vscode.Terminal;
let projDescPath: string;
const locDic = new LocDictionary("extension");

const openFolderMsg = locDic.localize("extension.openFolderFirst", "Open a folder first.");

export function activate(context: vscode.ExtensionContext) {

    const registerIDFCommand =
        (name: string, callback: (...args: any[]) => any): number => {
            return context.subscriptions.push(vscode.commands.registerCommand(name, callback));
        };

    // Create a status bar item with current workspace
    const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1000000);
    context.subscriptions.push(status);

    // Status Bar Item with common commands
    creatCmdsStatusBarItems();

    PreCheck.perform(PreCheck.isWorkspaceFolderOpen, openFolderMsg, () => {
        workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
        projDescPath = path.join(workspaceRoot.fsPath, "build", "project_description.json");
        updateProjName();
        const workspaceFolderInfo = {
            clickCommand: "espIdf.pickAWorkspaceFolder",
            currentWorkSpace: vscode.workspace.workspaceFolders[0].name,
            tooltip: vscode.workspace.workspaceFolders[0].uri.fsPath,
        };
        utils.updateStatus(status, workspaceFolderInfo);
    });

    vscode.workspace.onDidChangeWorkspaceFolders((e) => {
        if (workspaceRoot == null && vscode.workspace.workspaceFolders.length > 0) {
            workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
            projDescPath = path.join(workspaceRoot.fsPath, "build", "project_description.json");
        }
    });
    const projDescriptionWatcher = vscode.workspace.createFileSystemWatcher(projDescPath, true, false, true);
    let projDescwatcherDisposable = projDescriptionWatcher.onDidCreate(() => {
        updateProjName();
    });
    context.subscriptions.push(projDescwatcherDisposable);
    projDescwatcherDisposable = projDescriptionWatcher.onDidChange(() => {
        updateProjName();
    });
    context.subscriptions.push(projDescwatcherDisposable);

    vscode.debug.onDidTerminateDebugSession((e) => {
        // endOpenOcdServer(); // Should openOcd restart at every debug session?
    });

    registerIDFCommand("espIdf.createFiles", async () => {
        const option = await vscode.window.showQuickPick(
            utils.chooseTemplateDir(),
            { placeHolder: "Select a template to use" },
        );
        PreCheck.perform(PreCheck.isWorkspaceFolderOpen, openFolderMsg, () => {
            utils.createSkeleton(workspaceRoot.fsPath, option.target);
            const defaultFoldersMsg = locDic.localize("extension.defaultFoldersGeneratedMessage",
                "Default folders were generated.");
            vscode.window.showInformationMessage(defaultFoldersMsg);
        });
    });

    registerIDFCommand("espIdf.selectPort", SerialPort.shared().promptUserToSelect);

    registerIDFCommand("espIdf.pickAWorkspaceFolder", () => {
        PreCheck.perform(PreCheck.isWorkspaceFolderOpen, openFolderMsg, () => {
            const selectCurrentFolderMsg = locDic.localize("espIdf.pickAWorkspaceFolder.text",
                "Select your current folder");
            vscode.window.showWorkspaceFolderPick({ placeHolder: selectCurrentFolderMsg })
                .then((option) => {
                    if (option === undefined) {
                        const noFolderMsg = locDic.localize("extension.noFolderMessage",
                            "No workspace selected.");
                        vscode.window.showInformationMessage(noFolderMsg);
                        return;
                    } else {
                        workspaceRoot = option.uri;
                        projDescPath = path.join(workspaceRoot.fsPath, "build", "project_description.json");
                        updateProjName();
                        const workspaceFolderInfo = {
                            clickCommand: "espIdf.pickAWorkspaceFolder",
                            currentWorkSpace: option.name,
                            tooltip: option.uri.path,
                        };
                        utils.updateStatus(status, workspaceFolderInfo);
                    }
                });
        });
    });

    registerIDFCommand("espIdf.setPath", () => {
        PreCheck.perform(PreCheck.isWorkspaceFolderOpen, openFolderMsg, () => {
            const selectFrameworkMsg = locDic.localize("selectFrameworkMessage",
                "Select framework to define its path:");
            vscode.window.showQuickPick(
                [
                    { description: "IDF_PATH Path", label: "IDF_PATH", target: "esp" },
                    { description: "Path to xtensa-esp32-elf-gcc", label: "Toolchain Path", target: "xtensa" },
                    { description: "OpenOCD Binaries Path", label: "OpenOCD Binaries Path", target: "openocdBin" },
                    { description: "OpenOCD Scripts Path", label: "OpenOCD Scripts Path", target: "openocdScript" },
                ],
                { placeHolder: selectFrameworkMsg },
            ).then((option) => {
                if (option === undefined) {
                    const noOptionMsg = locDic.localize("extension.noOptionMessage",
                        "No option selected.");
                    vscode.window.showInformationMessage(noOptionMsg);
                    return;
                }
                let currentValue;
                switch (option.target) {
                    case "esp":
                        const enterIdfPathMsg = locDic.localize("extension.enterIdfPathMessage",
                            "Enter IDF_PATH Path");
                        currentValue = idfConf.readParameter("idf.espIdfPath", workspaceRoot);
                        idfConf.updateConfParameter("idf.espIdfPath",
                            enterIdfPathMsg, currentValue, option.label, workspaceRoot);
                        break;
                    case "xtensa":
                        const enterToolchainPathMsg = locDic.localize("extension.enterToolchainPathMessage",
                            "Enter Toolchain path");
                        currentValue = idfConf.readParameter("idf.xtensaEsp32Path", workspaceRoot);
                        idfConf.updateConfParameter(
                            "idf.xtensaEsp32Path",
                            enterToolchainPathMsg,
                            currentValue,
                            option.label,
                            workspaceRoot);
                        break;
                    case "openocdBin":
                        const enterOpenOcdBinariesPathMsg = locDic.localize(
                            "extension.enterOpenOcdBinariesPathMessage",
                            "Enter openOCD Binaries Path");
                        currentValue = idfConf.readParameter("idf.openOcdBin", workspaceRoot);
                        idfConf.updateConfParameter("idf.openOcdBin",
                            enterOpenOcdBinariesPathMsg, currentValue, option.label, workspaceRoot);
                        break;
                    case "openocdScript":
                        const enterOpenOcdScriptsPathMsg = locDic.localize(
                            "extension.enterOpenOcdScriptsPathMessage",
                            "Enter openOCD Scripts Path");
                        currentValue = idfConf.readParameter("idf.openOcdScriptsPath", workspaceRoot);
                        idfConf.updateConfParameter("idf.openOcdScriptsPath",
                            enterOpenOcdScriptsPathMsg, currentValue, option.label, workspaceRoot);
                        break;
                    default:
                        const noPathUpdatedMsg = locDic.localize("extension.noPathUpdatedMessage",
                            "No path has been updated");
                        vscode.window.showInformationMessage(noPathUpdatedMsg);
                        break;
                }
            });
        });
    });

    registerIDFCommand("espIdf.configDevice", () => {
        PreCheck.perform(PreCheck.isWorkspaceFolderOpen, openFolderMsg, () => {
            const selectConfigMsg = locDic.localize("extension.selectConfigMessage",
                "Select option to define its path :");
            vscode.window.showQuickPick(
                [
                    { description: "Device port path", label: "Device Port", target: "devicePort" },
                    { description: "Baud rate of device", label: "Baud Rate", target: "baudRate" },
                    { description: "Device Interface", label: "Interface", target: "deviceInterface" },
                    { description: "Board", label: "Board", target: "board" },
                ],
                { placeHolder: selectConfigMsg },
            ).then((option) => {
                if (option === undefined) {
                    const noOptionMsg = locDic.localize("extension.noOptionMessage",
                        "No option selected.");
                    vscode.window.showInformationMessage(noOptionMsg);
                    return;
                }
                let currentValue;
                switch (option.target) {
                    case "devicePort":
                        const enterDevicePortMsg = locDic.localize("extension.enterDevicePortMessage",
                            "Enter device port Path");
                        currentValue = idfConf.readParameter("idf.port", workspaceRoot);
                        idfConf.updateConfParameter(
                            "idf.port",
                            enterDevicePortMsg,
                            currentValue,
                            option.label,
                            workspaceRoot);
                        break;
                    case "baudRate":
                        const enterDeviceBaudRateMsg = locDic.localize("extension.enterDeviceBaudRateMessage",
                            "Enter device baud rate");
                        currentValue = idfConf.readParameter("idf.baudRate", workspaceRoot);
                        idfConf.updateConfParameter(
                            "idf.baudRate",
                            enterDeviceBaudRateMsg,
                            currentValue,
                            option.label,
                            workspaceRoot);
                        break;
                    case "deviceInterface":
                        const enterDeviceInterfaceMsg = locDic.localize("extension.enterDeviceInterfaceMessage",
                            "Enter interface as defined in docs");
                        currentValue = idfConf.readParameter("idf.deviceInterface", workspaceRoot);
                        idfConf.updateConfParameter(
                            "idf.deviceInterface",
                            enterDeviceInterfaceMsg,
                            currentValue,
                            option.label,
                            workspaceRoot);
                        break;
                    case "board":
                        const enterDeviceBoardMsg = locDic.localize("extension.enterDeviceBoardMessage",
                            "Enter board as defined in docs");
                        currentValue = idfConf.readParameter("idf.board", workspaceRoot);
                        idfConf.updateConfParameter(
                            "idf.board",
                            enterDeviceBoardMsg,
                            currentValue,
                            option.label,
                            workspaceRoot);
                        break;
                    default:
                        const noParamUpdatedMsg = locDic.localize("extension.noParamUpdatedMessage",
                            "No device parameter has been updated");
                        vscode.window.showInformationMessage(noParamUpdatedMsg);
                        break;
                }
            });
        });
    });

    registerIDFCommand("espIdf.cleanProject", () => {
        buildOrFlash("fullclean");
    });

    registerIDFCommand("espIdf.eraseFlash", () => {
        buildOrFlash("erase_flash");
    });

    const debugProvider = new IdfDebugConfigurationProvider();
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider("cppdbg", debugProvider));
    registerIDFCommand("espIdf.createVsCodeFolder", () => {
        PreCheck.perform(PreCheck.isWorkspaceFolderOpen, openFolderMsg, () => {
            utils.createVscodeFolder(workspaceRoot.fsPath);
            vscode.window.showInformationMessage("ESP-IDF VSCode files have been added to project.");
        });
    });

    registerIDFCommand("espIdf.flashDevice", flash);
    registerIDFCommand("espIdf.buildDevice", build);
    registerIDFCommand("espIdf.monitorDevice", createMonitor);
    registerIDFCommand("espIdf.buildFlashMonitor", flashAndMonitor);

    registerIDFCommand("espIdf.setDefaultConfig", () => {
        PreCheck.perform(PreCheck.isWorkspaceFolderOpen, openFolderMsg, () => {
            utils.setDefaultConfigFile(workspaceRoot);
            const defaultSdkconfigGeneratedMsg = locDic.localize("extension.defaultSdkconfigGeneratedMessage",
                "Default sdkconfig file restored.");
            vscode.window.showInformationMessage(defaultSdkconfigGeneratedMsg);
        });
    });

    registerIDFCommand("menuconfig.start", () => {
        PreCheck.perform(PreCheck.isWorkspaceFolderOpen, openFolderMsg, () => {
            MenuConfigPanel.createOrShow(context.extensionPath, workspaceRoot);
        });
    });

    registerIDFCommand("espIdf.openIdfDocument", (docUri: vscode.Uri) => {
        vscode.workspace.openTextDocument(docUri.fsPath).then((doc) => {
            vscode.window.showTextDocument(doc, vscode.ViewColumn.One, true);
        });
    });
    registerIDFCommand("espIdf.size", () => {
        PreCheck.perform(PreCheck.isWorkspaceFolderOpen, openFolderMsg, idfSizeFacade);
    });
}
function creatCmdsStatusBarItems() {
    const guiconfigStatusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 101);
    guiconfigStatusItem.text = "$(gear)";
    guiconfigStatusItem.tooltip = "ESP-IDF Launch GUI Configuration tool";
    guiconfigStatusItem.command = "menuconfig.start";
    guiconfigStatusItem.show();
    const buildStatusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    buildStatusItem.text = "$(database)";
    buildStatusItem.tooltip = "ESP-IDF Build project";
    buildStatusItem.command = "espIdf.buildDevice";
    buildStatusItem.show();
    const flashStatusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
    flashStatusItem.text = "$(zap)";
    flashStatusItem.tooltip = "ESP-IDF Flash device";
    flashStatusItem.command = "espIdf.flashDevice";
    flashStatusItem.show();
    const monitorStatusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98);
    monitorStatusItem.text = "$(device-desktop)";
    monitorStatusItem.tooltip = "ESP-IDF Monitor device";
    monitorStatusItem.command = "espIdf.monitorDevice";
    monitorStatusItem.show();
    const selectPortStatusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 97);
    selectPortStatusItem.text = "$(plug)";
    selectPortStatusItem.tooltip = "ESP-IDF Select device port";
    selectPortStatusItem.command = "espIdf.selectPort";
    selectPortStatusItem.show();
    const cleanProjectStatusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 96);
    cleanProjectStatusItem.text = "$(paintcan)";
    cleanProjectStatusItem.tooltip = "ESP-IDF Full Clean project";
    cleanProjectStatusItem.command = "espIdf.cleanProject";
    cleanProjectStatusItem.show();
    const eraseFlashStatusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 95);
    eraseFlashStatusItem.text = "$(trashcan)";
    eraseFlashStatusItem.tooltip = "ESP-IDF Erase flash";
    eraseFlashStatusItem.command = "espIdf.eraseFlash";
    eraseFlashStatusItem.show();
}

const build = () => {
    buildOrFlash("build");
};
const flash = () => {
    buildOrFlash("flash");
};
const flashAndMonitor = () => {
    buildOrFlash("flash", true);
};

function buildOrFlash(target: string, enableMonitorAfterProcess: boolean = false): any {
    PreCheck.perform(PreCheck.isWorkspaceFolderOpen, openFolderMsg, () => {
        const port = idfConf.readParameter("idf.port", workspaceRoot);
        const baudRate = idfConf.readParameter("idf.baudRate", workspaceRoot);
        const idfPathDir = idfConf.readParameter("idf.espIdfPath", workspaceRoot);
        const idfPath = path.join(
            idfPathDir,
            "tools", "idf.py");

        if (monitorTerminal !== undefined) {
            monitorTerminal.dispose();
            setTimeout(() => {
                monitorTerminal = undefined;
            }, 200);
        }

        if (idfChannel === undefined) {
            idfChannel = vscode.window.createOutputChannel("ESP-IDF");
        }
        idfChannel.show();
        const xtensaEsp32Path = path.join(idfConf.readParameter("idf.xtensaEsp32Path", workspaceRoot), "bin");
        if (!process.env.PATH.includes(xtensaEsp32Path)) {
            process.env.PATH = xtensaEsp32Path + path.delimiter + process.env.PATH;
        }

        if (!process.env.IDF_PATH) {
            process.env.IDF_PATH = idfPathDir;
        }

        const args = [].concat(idfPath, target, "-p", port, "-b", baudRate, "-C", workspaceRoot.fsPath);
        if (mainProcess === undefined) {
            mainProcess = spawn(
                "python",
                args,
            );
            mainProcess.on("exit", (code) => {
                mainProcess = undefined;
                if (code === 0 && enableMonitorAfterProcess) {
                    createMonitor();
                }
            });
            mainProcess.stderr.on("data", (data) => {
                idfChannel.append(data.toString());
            });

            mainProcess.stdout.on("data", (data) => {
                idfChannel.append(data.toString());
                vscode.window.withProgress({
                    location: vscode.ProgressLocation.Window,
                    title: "ESP-IDF:" + target,
                }, async (progress) => {
                    progress.report({ message: String.fromCharCode.apply(null, data) });
                    const p = new Promise((resolve) => {
                        setTimeout(() => {
                            resolve();
                        }, 500);
                    });
                    return p;
                },
                );
            });
        }

        updateProjName();
    });
}

function createMonitor(): any {
    PreCheck.perform(PreCheck.isWorkspaceFolderOpen, openFolderMsg, () => {
        if (mainProcess !== undefined) {
            const waitProcessIsFinishedMsg = locDic.localize("extension.waitProcessIsFinishedMessage",
                "Wait for ESP-IDF build or flash to finish");
            vscode.window.showErrorMessage(waitProcessIsFinishedMsg);
            return;
        }

        const idfPathDir = idfConf.readParameter("idf.espIdfPath", workspaceRoot);
        const port = idfConf.readParameter("idf.port", workspaceRoot);
        const baudRate = idfConf.readParameter("idf.baudRate", workspaceRoot);
        const idfPath = path.join(
            idfPathDir,
            "tools", "idf.py");
        const xtensaEsp32Path = path.join(idfConf.readParameter("idf.xtensaEsp32Path", workspaceRoot), "bin");
        if (!process.env.PATH.includes(xtensaEsp32Path)) {
            process.env.PATH = xtensaEsp32Path + path.delimiter + process.env.PATH;
        }
        if (!process.env.IDF_PATH) {
            process.env.IDF_PATH = idfPathDir;
        }
        if (monitorTerminal === undefined) {
            monitorTerminal = vscode.window.createTerminal({ name: "IDF Monitor", env: process.env });
        }
        monitorTerminal.show();
        monitorTerminal.sendText("cd " + workspaceRoot.fsPath);
        monitorTerminal.sendText(idfPath + " monitor -p " + port + " -b " + baudRate);
    });
}

function updateProjName() {
    if (idfDataProvider == null) {
        idfDataProvider = new IdfTreeDataProvider(projDescPath, workspaceRoot);
        vscode.window.registerTreeDataProvider("idfComponents", idfDataProvider);
    }

    if (!utils.fileExists(projDescPath)) {
        return;
    }

    idfDataProvider.refresh(projDescPath, workspaceRoot);

    fs.readFile(projDescPath, (err, data) => {
        if (err) {
            vscode.window.showErrorMessage(err.message);
            return;
        }
        const projDescJson = JSON.parse(data.toString());
        idfConf.writeParameter("idf.projectName", projDescJson.project_name, workspaceRoot);
    });
}

export function deactivate() {
    if (mainProcess !== undefined) {
        mainProcess.disconnect();
    }
    if (monitorTerminal !== undefined) {
        monitorTerminal.dispose();
    }
    if (idfChannel !== undefined) {
        idfChannel.dispose();
    }
    endOpenOcdServer();
}

export function startOpenOcdServer() {
    if (openOCDChannel === undefined) {
        openOCDChannel = vscode.window.createOutputChannel("OpenOCD");
    }
    if (ocdServer) {
        return;
    }
    const openOcdBin = idfConf.readParameter("idf.openOcdBin", workspaceRoot);
    const openOCDScriptsPath = idfConf.readParameter("idf.openOcdScriptsPath", workspaceRoot);
    const deviceInterface = idfConf.readParameter("idf.deviceInterface", workspaceRoot);
    const board = idfConf.readParameter("idf.board", workspaceRoot);

    if (!utils.fileExists(openOcdBin)) {
        const openocdBinNotFoundMsg = locDic.localize("extension.openocdBinNotFoundMessage",
            "OpenOCD binary path not found.");
        return vscode.window.showErrorMessage(openocdBinNotFoundMsg).then(() => {
            return undefined;
        });
    }
    if (!utils.fileExists(openOCDScriptsPath)) {
        const openocdScriptsNotFoundMsg = locDic.localize("extension.openocdScriptsNotFoundMessage",
            "OpenOCD scripts path not found.");
        return vscode.window.showErrorMessage(openocdScriptsNotFoundMsg).then(() => {
            return undefined;
        });
    }
    process.env.OPENOCD_SCRIPTS = openOCDScriptsPath;
    ocdServer = spawn(`${openOcdBin}`, ["-f", `${deviceInterface}`, "-f", `${board}`]);

    ocdServer.stderr.on("data", (data) => {
        openOCDChannel.append(data.toString());
    });
    ocdServer.stdout.on("data", (data) => {
        openOCDChannel.append(data.toString());
    });
    let isMainProcessRunning = true;
    while (isMainProcessRunning) {
        if ((mainProcess !== undefined && mainProcess.killed) || mainProcess === undefined) {
            isMainProcessRunning = false;
        }
    }
}

function idfSizeFacade() {
    const projectName = idfConf.readParameter("idf.projectName", workspaceRoot);
    const mapFilePath = path.join(workspaceRoot.fsPath, "build", `${projectName}.map`);
    const mapFileDontExistsErrorMessage = locDic.localize("extension.mapFileDontExistsErrorMessage",
        "Build is required for a size analysis, build your project first");

    if (!utils.fileExists(mapFilePath)) {
        vscode.window.showErrorMessage(mapFileDontExistsErrorMessage);
        return;
    }

    if (idfChannel === undefined) {
        idfChannel = vscode.window.createOutputChannel("ESP-IDF");
    }

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "ESP-IDF: Size analyzing...",
    }, async () => {
        try {
            idfChannel.show();
            idfChannel.clear();
            const buff = await calculateIDFBinarySize(mapFilePath);
            idfChannel.append(buff.toString());
        } catch (error) {
            console.log(`Something went wrong while retriving the size of the binaries, please see the error below\n${error}`);
            vscode.window.showErrorMessage("Something went wrong while retriving the size for the binaries!");
        }
    });
}

async function calculateIDFBinarySize(mapFilePath: string): Promise<Buffer> {
    const command = `python`;
    const idfPathDir = idfConf.readParameter("idf.espIdfPath", workspaceRoot);
    const idfPath = path.join(idfPathDir, "tools");
    return await utils.spawn(command, ["idf_size.py", mapFilePath], {
        cwd: idfPath,
    });
}

export function endOpenOcdServer() {
    if (ocdServer) {
        ocdServer.kill("SIGINT");
        ocdServer = undefined;
        openOCDChannel.dispose();
    }
}

class IdfDebugConfigurationProvider implements vscode.DebugConfigurationProvider {

    public resolveDebugConfiguration(
        folder: vscode.WorkspaceFolder | undefined,
        config: vscode.DebugConfiguration,
        token?: vscode.CancellationToken): vscode.ProviderResult<vscode.DebugConfiguration> {

        startOpenOcdServer();

        if (!config.program) {
            const elfNotFoundMsg = locDic.localize("extension.elfNotFoundMessage",
                "Project ELF file cannot be found.");
            return vscode.window.showErrorMessage(elfNotFoundMsg).then(() => {
                return undefined;
            });
        }

        if (!config.miDebuggerPath) {
            const gdbNotFoundMsg = locDic.localize("extension.gdbNotFoundMessage",
                "GDB path cannot be found.");
            return vscode.window.showErrorMessage(gdbNotFoundMsg).then(() => {
                return undefined;
            });
        }

        for (const key in config) {
            if (config.hasOwnProperty(key) && typeof config[key] === "string") {
                config[key] = idfConf.resolveVariables(config[key], workspaceRoot);
            }
        }

        return config;
    }
}
