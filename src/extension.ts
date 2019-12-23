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
import * as path from "path";
import * as vscode from "vscode";
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from "vscode-languageclient";
import { AppTraceManager } from "./espIdf/apptrace/appTraceManager";
import { AppTracePanel } from "./espIdf/apptrace/appTracePanel";
import { AppTraceArchiveTreeDataProvider } from "./espIdf/apptrace/tree/appTraceArchiveTreeDataProvider";
import { AppTraceTreeDataProvider } from "./espIdf/apptrace/tree/appTraceTreeDataProvider";
import { ConfserverProcess } from "./espIdf/menuconfig/confServerProcess";
import { OpenOCDManager } from "./espIdf/openOcd/openOcdManager";
import { SerialPort } from "./espIdf/serial/serialPort";
import { IDFSize } from "./espIdf/size/idfSize";
import { IDFSizePanel } from "./espIdf/size/idfSizePanel";
import { ExamplesPlanel } from "./examples/ExamplesPanel";
import * as idfConf from "./idfConfiguration";
import { LocDictionary } from "./localizationDictionary";
import { Logger } from "./logger/logger";
import { OutputChannel } from "./logger/outputChannel";
import { getOnboardingInitialValues } from "./onboarding/onboardingInit";
import { OnBoardingPanel } from "./onboarding/OnboardingPanel";
import * as utils from "./utils";
import { PreCheck } from "./utils";
import { initSelectedWorkspace, updateIdfComponentsTree, updateProjectName } from "./workspaceConfig";

// Global variables shared by commands
let workspaceRoot: vscode.Uri;
const statusBarItems: vscode.StatusBarItem[] = [];

const openOCDManager = OpenOCDManager.init();

// App Tracing
let appTraceTreeDataProvider: AppTraceTreeDataProvider;
let appTraceArchiveTreeDataProvider: AppTraceArchiveTreeDataProvider;
let appTraceManager: AppTraceManager;

// Kconfig Language Client
let kconfigLangClient: LanguageClient;

// Process to execute build, debug or monitor
let mainProcess: ChildProcess;
let monitorTerminal: vscode.Terminal;
const locDic = new LocDictionary(__filename);

const openFolderMsg = locDic.localize("extension.openFolderFirst", "Open a folder first.");

export async function activate(context: vscode.ExtensionContext) {
    utils.setExtensionContext(context);
    Logger.init(context);
    OutputChannel.init();

    const registerIDFCommand =
        (name: string, callback: (...args: any[]) => any): number => {
            return context.subscriptions.push(vscode.commands.registerCommand(name, callback));
        };

    // Create a status bar item with current workspace
    const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1000000);
    statusBarItems.push(status);
    context.subscriptions.push(status);

    // Status Bar Item with common commands
    creatCmdsStatusBarItems();

    // Create Kconfig Language Server Client
    startKconfigLangServer(context);

    // Register Tree Provider for IDF Explorer
    registerTreeProvidersForIDFExplorer(context);
    appTraceManager = new AppTraceManager(appTraceTreeDataProvider, appTraceArchiveTreeDataProvider);

    // register openOCD status bar item
    registerOpenOCDStatusBarItem(context);

    if (vscode.workspace.workspaceFolders &&
        vscode.workspace.workspaceFolders.length > 0) {
            workspaceRoot = initSelectedWorkspace(status);
    }

    vscode.workspace.onDidChangeWorkspaceFolders((e) => {
        if (vscode.workspace.workspaceFolders &&
            vscode.workspace.workspaceFolders.length > 0) {
            for (const ws of e.removed) {
                if (workspaceRoot && ws.uri === workspaceRoot) {
                    workspaceRoot = initSelectedWorkspace(status);
                    break;
                }
            }
            if (typeof workspaceRoot === undefined) {
                workspaceRoot = initSelectedWorkspace(status);
            }
        }
    });

    vscode.debug.onDidTerminateDebugSession((e) => {
        // endOpenOcdServer(); // Should openOcd restart at every debug session?
    });

    const sdkconfigWatcher = vscode.workspace.createFileSystemWatcher("**/sdkconfig", true, false, true);
    const sdkWatchDisposable = sdkconfigWatcher.onDidChange(async () => {
        if (ConfserverProcess.exists() && !ConfserverProcess.isSavedByUI()) {
            ConfserverProcess.loadGuiConfigValues();
        }
        ConfserverProcess.resetSavedByUI();
    });
    context.subscriptions.push(sdkWatchDisposable);

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
                    if (typeof option === "undefined") {
                        const noFolderMsg = locDic.localize("extension.noFolderMessage",
                            "No workspace selected.");
                        Logger.infoNotify(noFolderMsg);
                        return;
                    } else {
                        workspaceRoot = option.uri;
                        const projDescPath = path.join(workspaceRoot.fsPath, "build", "project_description.json");
                        updateProjectName(projDescPath);
                        updateIdfComponentsTree(projDescPath);
                        const workspaceFolderInfo = {
                            clickCommand: "espIdf.pickAWorkspaceFolder",
                            currentWorkSpace: option.name,
                            tooltip: option.uri.fsPath,
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
                    { description: "Set IDF_TOOLS_PATH Path", label: "IDF_TOOLS_PATH", target: "idfTools"},
                    { description: "Set paths to append to PATH",
                        label: "Custom extra paths", target: "customExtraPath"},
                ],
                { placeHolder: selectFrameworkMsg },
            ).then((option) => {
                if (typeof option === "undefined") {
                    const noOptionMsg = locDic.localize("extension.noOptionMessage",
                        "No option selected.");
                    Logger.infoNotify(noOptionMsg);
                    return;
                }
                let currentValue;
                let msg: string;
                let paramName: string;
                switch (option.target) {
                    case "esp":
                        msg = locDic.localize("extension.enterIdfPathMessage",
                            "Enter IDF_PATH Path");
                        paramName = "idf.espIdfPath";
                        break;
                    case "idfTools":
                        const enterIdfToolsPathMsg = locDic.localize("extension.enterIdfToolsPathMessage",
                                "Enter IDF_TOOLS_PATH path");
                        currentValue = idfConf.readParameter("idf.toolsPath");
                        idfConf.updateConfParameter(
                                "idf.toolsPath",
                                enterIdfToolsPathMsg,
                                currentValue,
                                option.label);
                        break;
                    case "customExtraPath":
                        const enterExtraPathsMsg = locDic.localize("extension.enterCustomPathsMessage",
                                "Enter extra paths to append to PATH");
                        currentValue = idfConf.readParameter("idf.customExtraPaths");
                        idfConf.updateConfParameter(
                                "idf.customExtraPaths",
                                enterExtraPathsMsg,
                                currentValue,
                                option.label);
                        break;
                    default:
                        const noPathUpdatedMsg = locDic.localize("extension.noPathUpdatedMessage",
                            "No path has been updated");
                        Logger.infoNotify(noPathUpdatedMsg);
                        break;
                }
                if (msg && paramName) {
                    currentValue = idfConf.readParameter(paramName);
                    idfConf.updateConfParameter(paramName, msg, currentValue, option.label);
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
                if (typeof option === "undefined") {
                    const noOptionMsg = locDic.localize("extension.noOptionMessage",
                        "No option selected.");
                    Logger.infoNotify(noOptionMsg);
                    return;
                }
                let currentValue;
                let msg: string;
                let paramName: string;
                switch (option.target) {
                    case "devicePort":
                        msg = locDic.localize("extension.enterDevicePortMessage",
                            "Enter device port Path");
                        paramName = "idf.port";
                        break;
                    case "baudRate":
                        msg = locDic.localize("extension.enterDeviceBaudRateMessage",
                            "Enter device baud rate");
                        paramName = "idf.baudRate";
                        break;
                    case "deviceInterface":
                        msg = locDic.localize("extension.enterDeviceInterfaceMessage",
                            "Enter interface as defined in docs");
                        paramName = "idf.deviceInterface";
                        break;
                    case "board":
                        msg = locDic.localize("extension.enterDeviceBoardMessage",
                            "Enter board as defined in docs");
                        paramName = "idf.board";
                        break;
                    default:
                        const noParamUpdatedMsg = locDic.localize("extension.noParamUpdatedMessage",
                            "No device parameter has been updated");
                        Logger.infoNotify(noParamUpdatedMsg);
                        break;
                }
                if (msg && paramName) {
                    currentValue = idfConf.readParameter(paramName);
                    idfConf.updateConfParameter(paramName, msg, currentValue, option.label);
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
            utils.delConfigFile(workspaceRoot);
            const defaultSdkconfigGeneratedMsg = locDic.localize("extension.defaultSdkconfigGeneratedMessage",
                "Default sdkconfig file restored.");
            Logger.infoNotify(defaultSdkconfigGeneratedMsg);
        });
    });

    registerIDFCommand("menuconfig.start", () => {
        PreCheck.perform(PreCheck.isWorkspaceFolderOpen, openFolderMsg, () => {
            try {
                if (ConfserverProcess.exists()) {
                    ConfserverProcess.loadExistingInstance();
                    return;
                }
                vscode.window.withProgress({
                    cancellable: false,
                    location: vscode.ProgressLocation.Notification,
                    title: "ESP-IDF: Menuconfig",
                }, async (progress: vscode.Progress<{ message: string, increment: number}>,
                          cancelToken: vscode.CancellationToken) => {
                        try {
                            ConfserverProcess.registerProgress(progress);
                            await ConfserverProcess.init(workspaceRoot, context.extensionPath);
                        } catch (error) {
                            Logger.errorNotify(error.message, error);
                        }
                });
            } catch (error) {
                Logger.errorNotify(error.message, error);
            }
        });
    });

    registerIDFCommand("onboarding.start", () => {
        try {
            if (OnBoardingPanel.isCreatedAndHidden()) {
                OnBoardingPanel.createOrShow(context.extensionPath);
                return;
            }
            vscode.window.withProgress({
                cancellable: false,
                location: vscode.ProgressLocation.Notification,
                title: "ESP-IDF: Configure extension",
            }, async (progress: vscode.Progress<{ message: string, increment: number}>,
                      cancelToken: vscode.CancellationToken) => {
                    try {
                        const onboardingArgs = await getOnboardingInitialValues(context.extensionPath, progress);
                        OnBoardingPanel.createOrShow(context.extensionPath, onboardingArgs);
                    } catch (error) {
                        Logger.errorNotify(error.message, error);
                    }
            });
        } catch (error) {
            Logger.errorNotify(error.message, error);
        }
    });

    registerIDFCommand("examples.start", () => {
        try {
            ExamplesPlanel.createOrShow(context.extensionPath);
        } catch (error) {
            Logger.errorNotify(error.message, error);
        }
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
            if (appTraceTreeDataProvider.appTraceStartButton.label.match(/start/gi)) {
                await appTraceManager.start();
            } else {
                await appTraceManager.stop();
            }
        });
    });

    registerIDFCommand("espIdf.openOCDCommand", () => {
        PreCheck.perform(PreCheck.isWorkspaceFolderOpen, openFolderMsg, openOCDManager.commandHandler);
    });

    registerIDFCommand("espIdf.apptrace.archive.refresh", () => {
        PreCheck.perform(PreCheck.isWorkspaceFolderOpen, openFolderMsg, () => {
            appTraceArchiveTreeDataProvider.populateArchiveTree();
        });
    });

    registerIDFCommand("espIdf.apptrace.archive.showReport", (trace) => {
        if (!trace) {
            Logger.errorNotify(
                "Cannot call this command directly, click on any Trace to view its report!",
                new Error("INVALID_COMMAND"),
            );
            return;
        }
        PreCheck.perform(PreCheck.isWorkspaceFolderOpen, openFolderMsg, () => {
            AppTracePanel.createOrShow(context, { trace: { fileName: trace.fileName, filePath: trace.filePath } });
        });
    });

    registerIDFCommand("espIdf.apptrace.customize", () => {
        PreCheck.perform(PreCheck.isWorkspaceFolderOpen, openFolderMsg, async () => {
            await AppTraceManager.saveConfiguration();
        });
    });

    const showOnboardingInit =  vscode.workspace.getConfiguration("idf").get("showOnboardingOnInit");
    if (showOnboardingInit) {
        vscode.commands.executeCommand("onboarding.start");
    }
}

function registerOpenOCDStatusBarItem(context: vscode.ExtensionContext) {
    const statusBarItem = openOCDManager.statusBarItem();
    context.subscriptions.push(statusBarItem);
}

function registerTreeProvidersForIDFExplorer(context: vscode.ExtensionContext) {
    appTraceTreeDataProvider = new AppTraceTreeDataProvider();
    appTraceArchiveTreeDataProvider = new AppTraceArchiveTreeDataProvider();

    context.subscriptions.push(appTraceTreeDataProvider.registerDataProviderForTree("idfAppTracer"));
    context.subscriptions.push(appTraceArchiveTreeDataProvider.registerDataProviderForTree("idfAppTraceArchive"));
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
    statusBarItems.push(statusBarItem);
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
        const port = idfConf.readParameter("idf.port");
        const baudRate = idfConf.readParameter("idf.baudRate");
        const idfPathDir = idfConf.readParameter("idf.espIdfPath");
        const pythonBinPath = idfConf.readParameter("idf.pythonBinPath") as string;
        const idfPath = path.join(
            idfPathDir,
            "tools", "idf.py");

        if (monitorTerminal) {
            monitorTerminal.dispose();
            setTimeout(() => {
                monitorTerminal = undefined;
            }, 200);
        }

        OutputChannel.show();
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

        process.env.IDF_PATH = idfPathDir;

        const args = [].concat(idfPath, "-p", port, "-b", baudRate, "-C", workspaceRoot.fsPath, target);
        if (typeof mainProcess === "undefined") {
            mainProcess = spawn(
                pythonBinPath,
                args,
            );
            mainProcess.on("exit", (code) => {
                mainProcess = undefined;
                if (code === 0 && enableMonitorAfterProcess) {
                    createMonitor();
                }
            });
            mainProcess.stderr.on("data", (data) => {
                OutputChannel.append(data.toString());
            });

            mainProcess.stdout.on("data", (data) => {
                OutputChannel.append(data.toString());
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

        const projDescPath = path.join(workspaceRoot.fsPath, "build", "project_description.json");
        updateProjectName(projDescPath);
        updateIdfComponentsTree(projDescPath);
    });
}

function createMonitor(): any {
    PreCheck.perform(PreCheck.isWorkspaceFolderOpen, openFolderMsg, () => {
        if (mainProcess) {
            const waitProcessIsFinishedMsg = locDic.localize("extension.waitProcessIsFinishedMessage",
                "Wait for ESP-IDF build or flash to finish");
            Logger.errorNotify(waitProcessIsFinishedMsg, new Error("One_Task_At_A_Time"));
            return;
        }

        const idfPathDir = idfConf.readParameter("idf.espIdfPath");
        const pythonBinPath = idfConf.readParameter("idf.pythonBinPath") as string;
        const port = idfConf.readParameter("idf.port");
        const idfPath = path.join(
            idfPathDir,
            "tools", "idf.py");
        const extraPaths = idfConf.readParameter("idf.customExtraPaths");
        if (!process.env.PATH.includes(extraPaths)) {
            process.env.PATH = extraPaths + path.delimiter + process.env.PATH;
        }
        const customVars = JSON.parse(idfConf.readParameter("idf.customExtraVars") as string);
        if (customVars) {
            for (const envVar in customVars) {
                if (envVar) {
                    process.env[envVar] = customVars[envVar];
                }
            }
        }
        if (typeof monitorTerminal === "undefined") {
            monitorTerminal = vscode.window.createTerminal({ name: "IDF Monitor", env: process.env,
                cwd: workspaceRoot.fsPath });
        }
        monitorTerminal.show();
        monitorTerminal.sendText(`export IDF_PATH=${idfPathDir}`);
        monitorTerminal.sendText(`${pythonBinPath} ${idfPath} -p ${port} monitor`);
    });
}

export function deactivate() {
    if (mainProcess) {
        mainProcess.disconnect();
    }
    if (monitorTerminal) {
        monitorTerminal.dispose();
    }
    OutputChannel.end();

    if (!kconfigLangClient) {
        return undefined;
    }
    kconfigLangClient.stop();
    ConfserverProcess.dispose();
    for (const statusItem of statusBarItems) {
        statusItem.dispose();
    }
}

class IdfDebugConfigurationProvider implements vscode.DebugConfigurationProvider {

    public resolveDebugConfiguration(
        folder: vscode.WorkspaceFolder | undefined,
        config: vscode.DebugConfiguration,
        token?: vscode.CancellationToken): vscode.ProviderResult<vscode.DebugConfiguration> {

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
                config[key] = idfConf.resolveVariables(config[key]);
            }
        }

        const customVars = JSON.parse(idfConf.readParameter("idf.customExtraVars") as string);
        if (customVars) {
            for (const envVar in customVars) {
                if (envVar) {
                    config[envVar] = customVars[envVar];
                }
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
            { scheme: "file", pattern: "**/Kconfig"},
            { scheme: "file", pattern: "**/Kconfig.projbuild"},
            { scheme: "file", pattern: "**/Kconfig.in"},
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
