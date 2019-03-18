import { ChildProcess, spawn } from "child_process";
import * as path from "path";
import * as vscode from "vscode";
import * as idfConf from "./idfConfiguration";
import { LocDictionary } from "./localizationDictionary";
import * as utils from "./utils";
import * as webviewContentGen from "./webViewContent";

const locDic = new LocDictionary("MenuconfigPanel");

export class MenuConfigPanel {
    public static currentPanel: MenuConfigPanel | undefined;

    public static createOrShow(extensionPath: string, curWorkspaceFolder: vscode.Uri) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;
        if (MenuConfigPanel.currentPanel) {
            if (MenuConfigPanel.currentPanel.areValuesSaved === false) {
                return;
            }
            MenuConfigPanel.currentPanel.panel.reveal(column);
        } else {
            MenuConfigPanel.currentPanel = new MenuConfigPanel(
                extensionPath, column || vscode.ViewColumn.One,
                curWorkspaceFolder);
        }
    }
    private static readonly viewType = "guiconfig";
    private areValuesSaved: boolean = true;
    private loadSavedValuesFlag: boolean = false;
    private guiConfigProcess: ChildProcess;
    private guiConfigProcessBuffer: string = "";
    private readonly panel: vscode.WebviewPanel;
    private readonly extensionPath: string;
    private disposables: vscode.Disposable[] = [];
    private confServerChannel: vscode.OutputChannel;
    private readonly tmpConf: string;
    private readonly configFile: string;
    private readonly curWorkspaceFolder: string;

    private initLayout = (() => {
        let executed = false;
        return function() {
            if (!executed) {
                this.panel.webview.postMessage({command: "init"});
                executed = true;
            }
        };
    })();

    private constructor(extensionPath: string, column: vscode.ViewColumn, curWorkspaceFolder: vscode.Uri) {
        this.tmpConf = path.join(curWorkspaceFolder.fsPath, "sdkconfig.tmp");
        this.configFile = path.join(curWorkspaceFolder.fsPath, "sdkconfig");
        this.curWorkspaceFolder = curWorkspaceFolder.fsPath;
        this._initGuiConfigProcess(curWorkspaceFolder);
        this.extensionPath = extensionPath;
        const panelTitle = locDic.localize("menuconfig.panelName", "IDF Menu Configuration");
        this.panel = vscode.window.createWebviewPanel(MenuConfigPanel.viewType, panelTitle, column, {
            enableScripts : true,
            retainContextWhenHidden: true,
        });

        this._update(curWorkspaceFolder);

        this.panel.onDidDispose(async () => {
            if (!this.areValuesSaved) {
                const saveRequest = JSON.stringify(`{"version": 2, "save": "${this.tmpConf}" }\n`);
                this.confServerChannel.appendLine(saveRequest);
                this.guiConfigProcess.stdin.write(saveRequest);

                const changesNotSavedMessage = locDic.localize("menuconfig.changesNotSaved",
                                "Changes in GUI Menuconfig have not been saved. Would you like to save them?");
                const saveMsg = locDic.localize("menuconfig.save", "Save");
                const discardMsg = locDic.localize("menuconfig.discard", "Don't save");
                const returnToGuiconfigMsg = locDic.localize("menuconfig.returnGuiconfig", "Return to GUI Menuconfig");

                const selected = await vscode.window.showInformationMessage(changesNotSavedMessage,
                    { modal: true },
                    { title: saveMsg, isCloseAffordance: false },
                    { title: returnToGuiconfigMsg, isCloseAffordance: false },
                    { title: discardMsg, isCloseAffordance: true });
                if (selected.title === saveMsg) {
                    this._saveGuiConfigValues();
                } else if (selected.title === returnToGuiconfigMsg) {
                    this.dispose();
                    vscode.commands.executeCommand("menuconfig.start");
                    return;
                }
                this._delTmpFileIfExists();
            }
            this.dispose();
        }, null, this.disposables);

        this.panel.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case "setDefault":
                    try {
                        this.areValuesSaved = false;
                        utils.setDefaultConfigFile(curWorkspaceFolder);
                        this._generateSdkconfigFile(curWorkspaceFolder);
                    } catch (error) {
                        vscode.window.showErrorMessage(error.message);
                        this._printErrorInOutputChannel(error.message);
                    }
                    return;
                case "updateValue":
                    try {
                        this.loadSavedValuesFlag = false;
                        this._updateGuiConfigValues(message.text);
                    } catch (error) {
                        vscode.window.showErrorMessage(error.message);
                        this._printErrorInOutputChannel(error.message);
                    }
                    return;
                case "saveChanges":
                    try {
                        this._saveGuiConfigValues();
                        const saveMessage = locDic.localize("menuconfig.saveValues",
                            "Saved changes in GUI menuconfig");
                        vscode.window.showInformationMessage(saveMessage);
                    } catch (error) {
                        vscode.window.showErrorMessage(error.message);
                        this._printErrorInOutputChannel(error.message);
                    }
                    return;
                case "discardsChanges":
                    try {
                        this.loadSavedValuesFlag = true;
                        this._loadGuiConfigValues();
                        const discardMessage = locDic.localize("menuconfig.discardValues",
                            "Discarded changes in GUI menuconfig");
                        vscode.window.showInformationMessage(discardMessage);

                    } catch (error) {
                        vscode.window.showErrorMessage(error.message);
                        this._printErrorInOutputChannel(error.message);
                    }
                    return;
                case "reqInitValues":
                    try {
                        this.checkIfJsonIsReceived();
                    } catch (error) {
                        vscode.window.showErrorMessage(error.message);
                    }
                    return;

            }
        });

        if (this.confServerChannel === undefined) {
            this.confServerChannel = vscode.window.createOutputChannel("ESP-IDF GUI Menuconfig");
        }
    }

    public dispose() {
        this.guiConfigProcess.stdin.end();
        this.guiConfigProcess = null;

        if (this.panel) {
            this.panel.dispose();
        }

        while (this.disposables.length) {
            const disp = this.disposables.pop();
            if (disp) {
                disp.dispose();
            }
        }
        this.confServerChannel.clear();
        this.confServerChannel.dispose();
        this.confServerChannel = null;
        MenuConfigPanel.currentPanel = null;
    }

    private _update(curWorkspaceFolder: vscode.Uri) {
        this.panel.webview.html = webviewContentGen.createHtmlConfig(this.extensionPath, curWorkspaceFolder);
    }

    private _setValues(values: string) {
        const jsonValues = JSON.parse(values);
        if (Object.keys(jsonValues.values).length <= 0) {
            return;
        } else {
            if (this.loadSavedValuesFlag) {
                this.areValuesSaved = true;
            }
        }

        if (jsonValues.error) {
            this._printErrorInOutputChannel("Invalid data error: " + jsonValues.error);
            return;
        }
        this.panel.webview.postMessage({command: "new_values", new_values: values});
    }

    private _initGuiConfigProcess(workspaceRoot: vscode.Uri) {
        const guiconfigEspPath = idfConf.readParameter("idf.espIdfPath", workspaceRoot);
        const idfPyPath = path.join(guiconfigEspPath, "tools", "idf.py");

        if (!utils.fileExists(guiconfigEspPath)) {
            const wrongPathMessage = locDic.localize("menuconfig.wrongIdfPath",
                            "Wrong IDF_PATH in workspace settings. Would you like to set it?");
            vscode.window.showErrorMessage(wrongPathMessage,
            "Yes", "No").then((selected) => {
                if (selected === "Yes") {
                    const enterPathMessage = locDic.localize("menuconfig.enterIdfPath",
                            "Enter IDF_PATH Path");
                    const currentValue = idfConf.readParameter("idf.espIdfPath", workspaceRoot);
                    idfConf.updateConfParameter("idf.espIdfPath",
                        enterPathMessage, currentValue, "IDF_PATH", workspaceRoot);
                }
            });
            return;
        }

        const xtensaEsp32Path = path.join(idfConf.readParameter("idf.xtensaEsp32Path", workspaceRoot), "bin");
        if (!process.env.PATH.includes(xtensaEsp32Path)) {
            process.env.PATH = xtensaEsp32Path + path.delimiter + process.env.PATH;
        }

        process.env.IDF_TARGET = "";
        process.env.PYTHONUNBUFFERED = "0";

        if (utils.fileExists(this.tmpConf)) {
            const confserverPath = path.join(guiconfigEspPath, "tools", "kconfig_new", "confserver.py");
            const kconfigPath = path.join(guiconfigEspPath, "Kconfig");
            const projDescJsonPath = path.join(this.curWorkspaceFolder, "build", "project_description.json");
            const projDescJson = JSON.parse(utils.readFileSync(projDescJsonPath));
            this.guiConfigProcess = spawn("python",
                [
                    confserverPath,
                    "--config", `${this.tmpConf}`,
                    "--kconfig", `${kconfigPath}`,
                    "--env", `COMPONENT_KCONFIGS=${projDescJson.config_environment.COMPONENT_KCONFIGS}`,
                    "--env",
                    `COMPONENT_KCONFIGS_PROJBUILD=${projDescJson.config_environment.COMPONENT_KCONFIGS_PROJBUILD}`,
                    "--env", "PYTHONUNBUFFERED = 0",
                ]);
            this.areValuesSaved = false;
        } else {
            this.guiConfigProcess = spawn("python", [idfPyPath, "confserver", "-C", workspaceRoot.fsPath]);
        }

        this.guiConfigProcess.stdout.on("data", (data) => {
            this.guiConfigProcessBuffer += data;

            if (this.confServerChannel) {
                this.confServerChannel.appendLine(data.toString());
            }
            this.checkIfJsonIsReceived();
        });

        this.guiConfigProcess.stderr.on("data", (data) => {
            if (utils.isStringNotEmpty(data.toString())) {
                if (data.toString().includes("Server running, waiting for requests on stdin..") ||
                    data.toString().includes("Saving config to") || data.toString().includes("Loading config from") ||
                    data.toString().includes("The following config symbol(s) were not visible so were not updated")) {
                    if (this.confServerChannel) {
                        this.confServerChannel.appendLine(data.toString());
                    }
                } else {
                    this._printErrorInOutputChannel(data.toString());
                }
            }
        });

        this.guiConfigProcess.on("error", (err) => {
            err.stack === null ?
                this._printErrorInOutputChannel(err.message) : this._printErrorInOutputChannel(err.stack);
        });

        this.guiConfigProcess.on("exit", (code, signal) => {
            if (code !== 0) {
                this._printErrorInOutputChannel(`Received exit signal: ${signal}, code : ${code}`);
            }
        });
    }

    private _generateSdkconfigFile(workspaceRoot: vscode.Uri) {
        const guiconfigEspPath = idfConf.readParameter("idf.espIdfPath", workspaceRoot);
        const idfPyPath = path.join(guiconfigEspPath, "tools", "idf.py");
        const getSdkconfigProcess = spawn("python", [idfPyPath, "reconfigure", "-C", workspaceRoot.fsPath]);

        getSdkconfigProcess.stderr.on("data", (data) => {
            if (utils.isStringNotEmpty(data.toString())) {
                this._printErrorInOutputChannel(data.toString());
            }
        });

        getSdkconfigProcess.stdout.on("data", (data) => {
            this.confServerChannel.appendLine(data.toString());
        });
        getSdkconfigProcess.on("exit", (code, signal) => {
            if (code !== 0) {
                this._printErrorInOutputChannel(
                    `When loading default values received exit signal: ${signal}, code : ${code}`);
            }
            this._loadGuiConfigValues();
            const loadMessage = locDic.localize("menuconfig.loadDefaultValues",
                "Loaded default settings in GUI menuconfig");
            vscode.window.showInformationMessage(loadMessage);
        });
    }

    private _updateGuiConfigValues(args: {
                                            compFolder: string,
                                            paramName: string,
                                            newValue: string,
                                            isModifiedByUser: boolean,
                                        }) {
        if (args.newValue == null) {
            return;
        }
        const newValueRequest = `{"version": 2, "set": { "${args.paramName}": ${args.newValue} }}\n`;
        this.confServerChannel.appendLine(newValueRequest);
        this.guiConfigProcess.stdin.write(newValueRequest);
        if (args.isModifiedByUser) {
            this.areValuesSaved = false;
        }
    }

    private _delTmpFileIfExists() {
        if (utils.fileExists(this.tmpConf)) {
            utils.delTmpConfigFile(this.curWorkspaceFolder);
        }
    }

    private _saveGuiConfigValues() {
        this._delTmpFileIfExists();
        const saveRequest = JSON.stringify(`{"version": 2, "save": "${this.configFile}" }\n`);
        this.confServerChannel.appendLine(saveRequest);
        this.guiConfigProcess.stdin.write(saveRequest);
        this.areValuesSaved = true;
    }

    private _loadGuiConfigValues() {
        this._delTmpFileIfExists();
        const loadRequest = JSON.stringify(`{"version": 2, "load": "${this.configFile}" }\n`);
        this.confServerChannel.appendLine(loadRequest);
        this.guiConfigProcess.stdin.write(loadRequest);
    }

    private _printErrorInOutputChannel(data: string) {
        this.confServerChannel.show();
        this.confServerChannel.appendLine("---------------------------ERROR--------------------------");
        this.confServerChannel.appendLine("\n" + data);
        this.confServerChannel.appendLine("-----------------------END OF ERROR-----------------------");
    }

    private checkIfJsonIsReceived() {
        const newValuesJsonReceived = this.guiConfigProcessBuffer.match(/(\{[.\s\S]*?\}\})/g);
        if ( newValuesJsonReceived !== null && newValuesJsonReceived.length > 0) {
            if (utils.fileExists(this.tmpConf)) {
                setTimeout(() => {
                    this.initLayout();
                }, 500);
            } else {
                this.initLayout();
            }
            const lastIndex = newValuesJsonReceived.length - 1;
            this._setValues(newValuesJsonReceived[lastIndex]);
        }
    }

}
