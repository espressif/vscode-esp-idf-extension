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
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from "vscode-languageclient";
import { AppTracer } from "./espIdf/apptrace/tree/appTracer";
import { SerialPort } from "./espIdf/serial/serialPort";
import { IDFSize } from "./espIdf/size/idfSize";
import { IDFSizePanel } from "./espIdf/size/idfSizePanel";
import { IdfTreeDataProvider } from "./idfComponentsDataProvider";
import * as idfConf from "./idfConfiguration";
import { LocDictionary } from "./localizationDictionary";
import { Logger } from "./logger/logger";
import { MenuConfigPanel } from "./MenuconfigPanel";
import * as utils from "./utils";
import { PreCheck } from "./utils";

// Global variables shared by commands
let workspaceRoot: vscode.Uri;

// OpenOCD Server Process and Output Channel
let ocdServer: ChildProcess;
let openOCDChannel: vscode.OutputChannel;

// App Tracing
let appTracer: AppTracer;

// Kconfig Language Client
let kconfigLangClient: LanguageClient;

// Process to execute build, debug or monitor
let idfDataProvider: IdfTreeDataProvider;
let idfChannel: vscode.OutputChannel;
let mainProcess: ChildProcess;
let monitorTerminal: vscode.Terminal;
let projDescPath: string;
const locDic = new LocDictionary("extension");

const openFolderMsg = locDic.localize("extension.openFolderFirst", "Open a folder first.");

export function activate(context: vscode.ExtensionContext) {
    Logger.init(context);

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

    // Create Kconfig Language Server Client
    startKconfigLangServer(context);

    // Register Tree Provider for IDF Explorer
    registerTreeProvidersForIDFExplorer(context);

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
            Logger.infoNotify(defaultFoldersMsg);
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
                        Logger.infoNotify(noFolderMsg);
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
                    Logger.infoNotify(noOptionMsg);
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
                        Logger.infoNotify(noPathUpdatedMsg);
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
                    Logger.infoNotify(noOptionMsg);
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
                        Logger.infoNotify(noParamUpdatedMsg);
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
            Logger.infoNotify("ESP-IDF VSCode files have been added to project.");
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
            Logger.infoNotify(defaultSdkconfigGeneratedMsg);
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
        PreCheck.perform(PreCheck.isWorkspaceFolderOpen, openFolderMsg, () => {
            const idfSize = new IDFSize(workspaceRoot);
            try {
                if (IDFSizePanel.isCreatedAndHidden()) {
                    IDFSizePanel.createOrShow(context);
                    return;
                }

                vscode.window.withProgress({
                    cancellable: true,
                    location: vscode.ProgressLocation.Notification,
                    title: "ESP-IDF: Size",
                    // tslint:disable-next-line: max-line-length
                }, async (progress: vscode.Progress<{ message: string, increment: number }>, cancelToken: vscode.CancellationToken) => {
                    try {
                        cancelToken.onCancellationRequested(idfSize.cancel);
                        const results = await idfSize.calculateWithProgress(progress);
                        if (!cancelToken.isCancellationRequested) {
                            IDFSizePanel.createOrShow(context, results);
                        }
                    } catch (error) {
                        Logger.errorNotify(error.message, error);
                    }
                });
            } catch (error) {
                Logger.errorNotify(error.message, error);
            }
        });
    });

    registerIDFCommand("espIdf.apptrace", () => {
        PreCheck.perform(PreCheck.isWorkspaceFolderOpen, openFolderMsg, async () => {
            appTracer.toggleStartAppTraceButton();
        });
    });
}

function registerTreeProvidersForIDFExplorer(context: vscode.ExtensionContext) {
    appTracer = new AppTracer();
    context.subscriptions.push(appTracer.registerDataProviderForTree("idfAppTracer"));
}

function creatCmdsStatusBarItems() {
    createStatusBarItem("$(plug)", "ESP-IDF Select device port", "espIdf.selectPort", 100);
    createStatusBarItem("$(gear)", "ESP-IDF Launch GUI Configuration tool", "menuconfig.start", 99);
    createStatusBarItem("$(database)", "ESP-IDF Build project", "espIdf.buildDevice", 98);
    createStatusBarItem("$(zap)", "ESP-IDF Flash device", "espIdf.flashDevice", 97);
    createStatusBarItem("$(device-desktop)", "ESP-IDF Monitor device", "espIdf.monitorDevice", 96);
    createStatusBarItem("$(paintcan)", "ESP-IDF Full Clean project", "espIdf.cleanProject", 95);
    createStatusBarItem("$(trashcan)", "ESP-IDF Erase device flash", "espIdf.eraseFlash", 94);
}

function createStatusBarItem(icon: string, tooltip: string, cmd: string, priority: number) {
    const alignment: vscode.StatusBarAlignment = vscode.StatusBarAlignment.Left;
    const statusBarItem = vscode.window.createStatusBarItem(alignment, priority);
    statusBarItem.text = icon;
    statusBarItem.tooltip = tooltip;
    statusBarItem.command = cmd;
    statusBarItem.show();
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

        const args = [].concat(idfPath, "-p", port, "-b", baudRate, "-C", workspaceRoot.fsPath, target);
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
            Logger.errorNotify(waitProcessIsFinishedMsg, new Error("One_Task_At_A_Time"));
            return;
        }

        const idfPathDir = idfConf.readParameter("idf.espIdfPath", workspaceRoot);
        const port = idfConf.readParameter("idf.port", workspaceRoot);
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
        monitorTerminal.sendText(`cd ${workspaceRoot.fsPath}`);
        monitorTerminal.sendText(`${idfPath} -p ${port} monitor`);
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
            Logger.errorNotify(err.message, err);
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

    if (!kconfigLangClient) {
        return undefined;
    }
    kconfigLangClient.stop();
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

export function startKconfigLangServer(context: vscode.ExtensionContext) {
    const serverModule = context.asAbsolutePath(path.join("out", "kconfig", "server.js"));

    const debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

    const serverOptions: ServerOptions = {
        debug: {
            module: serverModule,
            options: debugOptions,
            transport: TransportKind.ipc,
        },
        run: { module: serverModule, transport: TransportKind.ipc },
    };

    const clientOptions: LanguageClientOptions = {
        documentSelector: [
            { scheme: "file", pattern: "**/Kconfig" },
            { scheme: "file", pattern: "**/Kconfig.projbuild" },
        ],
        synchronize: {
            fileEvents: vscode.workspace.createFileSystemWatcher("**/.clientrc"),
        },
    };

    kconfigLangClient = new LanguageClient(
        "kconfigServer",
        "Kconfig Language Server",
        serverOptions,
        clientOptions,
    );
    kconfigLangClient.start();

}
