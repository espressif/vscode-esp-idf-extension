"use strict";
import { ChildProcess, spawn, spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { IdfTreeDataProvider } from "./idfComponentsDataProvider";
import * as idfConf from "./idfConfiguration";
import { LocDictionary } from "./localizationDictionary";
import { MenuConfigPanel } from "./MenuconfigPanel";
import * as utils from "./utils";

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

const openFolderMsg = locDic.localize("extension.openFolderFirst",
                        "Open a folder first.");

export function activate(context: vscode.ExtensionContext) {

    // Create a status bar item with current workspace
    const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1000000);
    context.subscriptions.push(status);

    if (utils.isFolderOpen()) {
        workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
        projDescPath = path.join(workspaceRoot.fsPath, "build", "project_description.json");
        updateProjName();
        const workspaceFolderInfo = {
            clickCommand: "espIdf.pickAWorkspaceFolder",
            currentWorkSpace: vscode.workspace.workspaceFolders[0].name,
            tooltip: vscode.workspace.workspaceFolders[0].uri.path,
        };
        utils.updateStatus(status, workspaceFolderInfo);
    }

    vscode.workspace.onDidChangeWorkspaceFolders((e) => {
        if (workspaceRoot == null && vscode.workspace.workspaceFolders.length > 0) {
            workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
            projDescPath = path.join(workspaceRoot.fsPath, "build", "project_description.json");
        }
    });

    let disposable = vscode.commands.registerCommand("espIdf.createFiles", () => {
        vscode.window.showQuickPick(
            utils.chooseTemplateDir(),
            { placeHolder: "Select a template to use"},
            ).then((option) => {
                if (option === undefined) {
                    return;
                }
                if (utils.isFolderOpen()) {
                    utils.createSkeleton(workspaceRoot.fsPath, option.target);
                    const defaultFoldersMsg = locDic.localize("extension.defaultFoldersGeneratedMessage",
                        "Default folders were generated.");
                    vscode.window.showInformationMessage(defaultFoldersMsg);
                } else {
                    vscode.window.showInformationMessage(openFolderMsg);
                }
            });
     });
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand("espIdf.selectPort", () => {
        if (!utils.isFolderOpen()) {
            vscode.window.showInformationMessage(openFolderMsg);
            return;
        }
        const serialListScriptPath = path.join(context.extensionPath, "get_serial_list.py");
        const portProcess = spawnSync("python", [serialListScriptPath]);
        const regexp = /\'(.*?)\'/g;
        const arrayPrint = portProcess.stdout.toString().match(regexp);
        const choices = [];
        if (arrayPrint !== null && arrayPrint.length > 0) {
            arrayPrint.forEach((portStr) => {
                const portChoice = portStr.replace("'", "").replace("'", "").trim();
                choices.push({label: portChoice, target: portChoice});
            });
        } else {
            const noPortFoundMsg = locDic.localize("extension.notSerialPortFoundMessage",
                "Could not find any serial port available");
            vscode.window.showErrorMessage(noPortFoundMsg);
            return;
        }
        const selectSerialPortMsg = locDic.localize("extension.selectSerialPortMessage",
                "Select the available serial port where your device is connected.");
        vscode.window.showQuickPick(
            choices,
            { placeHolder: selectSerialPortMsg},
        ).then((option) => {
            if (option === undefined) {
                const noSelectedPortMsg = locDic.localize("extension.noPortSelectedMessage",
                "No port selected.");
                vscode.window.showInformationMessage(noSelectedPortMsg);
                return;
            }
            idfConf.writeParameter("idf.port", option.target, workspaceRoot);
            const portHasBeenSelectedMsg = locDic.localize("extension.portHasBeenSelectedMessage",
                "Port has been updated to ");
            vscode.window.showInformationMessage(portHasBeenSelectedMsg + option.target);
        });

     });
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand("espIdf.pickAWorkspaceFolder", () => {
        if (!utils.isFolderOpen()) {
            vscode.window.showInformationMessage(openFolderMsg);
            return;
        }
        const selectCurrentFolderMsg = locDic.localize("espIdf.pickAWorkspaceFolder.text",
            "Select your current folder");
        vscode.window.showWorkspaceFolderPick({ placeHolder: selectCurrentFolderMsg})
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
    context.subscriptions.push(disposable);

    const projDescriptionWatcher = vscode.workspace.createFileSystemWatcher(projDescPath, true, false, true);

    let projDescwatcherDisposable = projDescriptionWatcher.onDidCreate(() => {
        updateProjName();
     });
    context.subscriptions.push(projDescwatcherDisposable);

    projDescwatcherDisposable = projDescriptionWatcher.onDidChange(() => {
        updateProjName();
     });
    context.subscriptions.push(projDescwatcherDisposable);

    disposable = vscode.commands.registerCommand("espIdf.setPath", () => {
        if (!utils.isFolderOpen()) {
            vscode.window.showInformationMessage(openFolderMsg);
            return;
        }
        const selectFrameworkMsg = locDic.localize("selectFrameworkMessage",
        "Select framework to define its path:");
        vscode.window.showQuickPick(
            [
                { description: "IDF_PATH Path", label: "IDF_PATH", target: "esp"},
                { description: "Path to xtensa-esp32-elf-gcc", label: "Toolchain Path", target: "xtensa"},
                { description: "OpenOCD Binaries Path", label: "OpenOCD Binaries Path", target: "openocdBin"},
                { description: "OpenOCD Scripts Path", label: "OpenOCD Scripts Path", target: "openocdScript"},
            ],
            { placeHolder : selectFrameworkMsg},
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
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand("espIdf.configDevice", () => {
        if (!utils.isFolderOpen()) {
            vscode.window.showInformationMessage(openFolderMsg);
            return;
        }
        const selectConfigMsg = locDic.localize("extension.selectConfigMessage",
        "Select option to define its path :");
        vscode.window.showQuickPick(
            [
                { description: "Device port path", label: "Device Port", target: "devicePort"},
                { description: "Baud rate of device", label: "Baud Rate", target: "baudRate"},
                { description: "Device Interface", label: "Interface", target: "deviceInterface"},
                { description: "Board", label: "Board", target: "board"},
            ],
            { placeHolder : selectConfigMsg},
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
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand("espIdf.createVsCodeFolder", () => {
        if (!utils.isFolderOpen()) {
            vscode.window.showInformationMessage(openFolderMsg);
            return;
        }
        utils.createVscodeFolder(workspaceRoot.fsPath);
        vscode.window.showInformationMessage("ESP-IDF VSCode files have been added to project.");
    });

    disposable = vscode.commands.registerCommand("espIdf.flashDevice", () => {
        buildOrFlash("flash");
    });
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand("espIdf.buildDevice", () => {
        buildOrFlash("build");
    });
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand("espIdf.monitorDevice", () => {
        createMonitor();
    });
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand("espIdf.buildFlashMonitor", () => {
        buildOrFlash("flash", true); // To enable create_monitor after call
    });
    context.subscriptions.push(disposable);

    const debugProvider = new IdfDebugConfigurationProvider();
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider("cppdbg", debugProvider));

    vscode.debug.onDidTerminateDebugSession((e) => {
        // endOpenOcdServer(); // Should openOcd restart at every debug session?
    });

    disposable = vscode.commands.registerCommand("espIdf.setDefaultConfig", () => {
        if (!utils.isFolderOpen()) {
            vscode.window.showInformationMessage(openFolderMsg);
            return;
        }
        utils.setDefaultConfigFile(workspaceRoot);
        const defaultSdkconfigGeneratedMsg = locDic.localize("extension.defaultSdkconfigGeneratedMessage",
            "Default sdkconfig file restored.");
        vscode.window.showInformationMessage(defaultSdkconfigGeneratedMsg);
     });
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand("menuconfig.start", () => {
        if (!utils.isFolderOpen()) {
            vscode.window.showInformationMessage(openFolderMsg);
            return;
        }
        MenuConfigPanel.createOrShow(context.extensionPath, workspaceRoot);
     });
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand("espIdf.openIdfDocument", (docUri: vscode.Uri) => {
        vscode.workspace.openTextDocument(docUri.fsPath).then((doc) => {
            vscode.window.showTextDocument(doc, vscode.ViewColumn.One, true);
        });
    });
    context.subscriptions.push(disposable);

    //register for the idf_size.py
    disposable = vscode.commands.registerCommand("espIdf.size", ()=>{
        if (!utils.isFolderOpen()) {
            vscode.window.showInformationMessage(openFolderMsg);
            return;
        }
        idfSizeFacade()
    });
    context.subscriptions.push(disposable);
}

function buildOrFlash(target: string, enableMonitorAfterProcess: boolean = false) {
    if (!utils.isFolderOpen()) {
        vscode.window.showInformationMessage(openFolderMsg);
        return;
    }
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
                progress.report({ message: String.fromCharCode.apply(null, data)});
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
}

function createMonitor() {
    if (!utils.isFolderOpen()) {
        vscode.window.showInformationMessage(openFolderMsg);
        return;
    }

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
        monitorTerminal = vscode.window.createTerminal({ name: "IDF Monitor", env: process.env});
    }
    monitorTerminal.show();
    monitorTerminal.sendText("cd " + workspaceRoot.fsPath);
    monitorTerminal.sendText(idfPath + " monitor -p " + port + " -b " + baudRate);
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

function idfSizeFacade(){
    const projectName = idfConf.readParameter("idf.projectName", workspaceRoot);
    const mapFilePath = path.join(workspaceRoot.fsPath, 'build', `${projectName}.map`);
    const mapFileDontExistsErrorMessage = locDic.localize("extension.mapFileDontExistsErrorMessage", "Build is required for a size analysis, build your project first");

    if (!utils.fileExists(mapFilePath)) {
        vscode.window.showErrorMessage(mapFileDontExistsErrorMessage)
        return
    }
    
    if (idfChannel === undefined) {
        idfChannel = vscode.window.createOutputChannel("ESP-IDF");
    }

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "ESP-IDF: Size analyzing..."
    }, async ()=>{
        try {
            idfChannel.show()
            idfChannel.clear()
            await calculateIDFBinarySize(mapFilePath, idfChannel)
        } catch (error) {
            console.log(`Something went wrong while retriving the size of the binaries, please see the error below\n${error}`)
            vscode.window.showErrorMessage("Something went wrong while retriving the size for the binaries!")
        }
    })
}

async function calculateIDFBinarySize(mapFilePath : string, channel : vscode.OutputChannel){
    const command = `python`
    const idfPathDir = idfConf.readParameter("idf.espIdfPath", workspaceRoot);
    const idfPath = path.join(idfPathDir, "tools");
    await utils.spawn(command, channel, ['idf_size.py', mapFilePath], {
        cwd: idfPath
    })
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
