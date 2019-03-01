import { ChildProcess, spawn } from "child_process";
import * as path from "path";
import * as vscode from "vscode";
import * as idfConf from "./idfConfiguration";
import { LocDictionary } from "./localizationDictionary";
import * as utils from "./utils";
import * as webviewContentGen from "./webViewContent";

const locDic = new LocDictionary("MenuconfigPanel");

export class MenuConfigPanel {
    /*
     * Track current panel, allowing only one to exist.
     */
    // public static confServerProcess;
    public static currentPanel: MenuConfigPanel | undefined;

    public static createOrShow(extensionPath: string, curWorkspaceFolder: vscode.Uri) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;
        if (MenuConfigPanel.currentPanel) {
            MenuConfigPanel.currentPanel.panel.reveal(column);
        } else {
            MenuConfigPanel.currentPanel = new MenuConfigPanel(
                extensionPath, column || vscode.ViewColumn.One,
                curWorkspaceFolder);
        }
    }

    private static readonly viewType = "guiconfig";
    private guiConfigProcess: ChildProcess;
    private guiConfigProcessLog: string = "";
    private readonly panel: vscode.WebviewPanel;
    private readonly extensionPath: string;
    private disposables: vscode.Disposable[] = [];
    private confServerChannel: vscode.OutputChannel;

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
        this._initGuiConfigProcess(curWorkspaceFolder);
        this.extensionPath = extensionPath;
        const panelTitle = locDic.localize("menuconfig.panelName", "IDF Menu Configuration");
        this.panel = vscode.window.createWebviewPanel(MenuConfigPanel.viewType, panelTitle, column, {
            enableScripts : true,
            retainContextWhenHidden: true,
        });

        this._update(curWorkspaceFolder);

        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        this.panel.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case "setDefault":
                    try {
                        utils.setDefaultConfigFile(curWorkspaceFolder);
                        this._loadGuiConfigValues();
                        const loadMessage = locDic.localize("menuconfig.loadDefaultValues",
                            "Loaded default settings in GUI menuconfig");
                        vscode.window.showInformationMessage(loadMessage);
                    } catch (error) {
                        vscode.window.showErrorMessage(error.message);
                    }
                    return;
                case "updateValue":
                    try {
                        this._updateGuiConfigValues(message.text);
                    } catch (error) {
                        vscode.window.showErrorMessage(error.message);
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
                    }
                    return;
                case "discardsChanges":
                    try {
                        this._loadGuiConfigValues();
                        const discardMessage = locDic.localize("menuconfig.discardValues",
                            "Discarded changes in GUI menuconfig");
                        vscode.window.showInformationMessage(discardMessage);

                    } catch (error) {
                        vscode.window.showErrorMessage(error.message);
                    }
                    return;
                case "reqInitValues":
                    try {
                        this._reqInitValues();
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
        MenuConfigPanel.currentPanel = undefined;
        this.guiConfigProcess.stdin.end();
        this.panel.dispose();

        while (this.disposables.length) {
            const disp = this.disposables.pop();
            if (disp) {
                disp.dispose();
            }
        }
        this.confServerChannel.clear();
        this.confServerChannel.dispose();
        this.confServerChannel = null;
        this.guiConfigProcess = null;
        MenuConfigPanel.currentPanel = null;
    }

    private _reqInitValues() {
        const startIndex = this.guiConfigProcessLog.lastIndexOf("\n{\"ranges");
        const lastIndex = this.guiConfigProcessLog.lastIndexOf("\n");
        const newValuesString = this.guiConfigProcessLog.substr(startIndex + 1,
            lastIndex + 2);
        if (utils.isJson(newValuesString)) {
            this._setValues(newValuesString);
        }
    }

    private _update(curWorkspaceFolder: vscode.Uri) {
        this.panel.webview.html = webviewContentGen.createHtmlConfig(this.extensionPath, curWorkspaceFolder);
    }

    private _setValues(values: string) {
        const jsonValues = JSON.parse(values);
        if (jsonValues.error) {
            this._printErrorInOutputChannel("Invalid data error: " + jsonValues.error);
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
        this.guiConfigProcess = spawn("python", [idfPyPath, "confserver", "-C", workspaceRoot.fsPath]);

        this.guiConfigProcess.stdout.on("data", (data) => {
            this.guiConfigProcessLog += data;

            if (this.confServerChannel) {
                this.confServerChannel.appendLine(data.toString());
            }

            const startIndex = this.guiConfigProcessLog.lastIndexOf("\n{\"ranges");
            const lastIndex = this.guiConfigProcessLog.lastIndexOf("\n");
            this.guiConfigProcessLog = this.guiConfigProcessLog.substr(startIndex + 1);
            const newValuesString = this.guiConfigProcessLog.substr(startIndex + 1,
                lastIndex + 2);
            if (utils.isJson(newValuesString)) {
                this.initLayout();
                this._setValues(newValuesString);
            }
        });

        this.guiConfigProcess.stderr.on("data", (data) => {
            if (data.toString().includes("Server running, waiting for requests on stdin..") ||
                    data.toString().includes("Saving config to") || data.toString().includes("Loading config from")) {
                this.confServerChannel.appendLine(data.toString());
            } else {
                this._printErrorInOutputChannel(data.toString());
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

    private _updateGuiConfigValues(args: { comp_folder: string, paramName: string, newValue: string }) {
        const newValueRequest = "{\"version\": \"1\", \"set\": {\"" +
            args.paramName + "\": " + args.newValue + " } }\n";
        this.confServerChannel.appendLine(newValueRequest);
        this.guiConfigProcess.stdin.write(newValueRequest);
    }

    private _saveGuiConfigValues() {
        const saveRequest = `{"version": 1, "save": null }\n`;
        this.confServerChannel.appendLine(saveRequest);
        this.guiConfigProcess.stdin.write(saveRequest);
    }

    private _loadGuiConfigValues() {
        const loadRequest = `{"version": 1, "load": null }\n`;
        this.confServerChannel.appendLine(loadRequest);
        this.guiConfigProcess.stdin.write(loadRequest);
    }

    private _printErrorInOutputChannel(data: string) {
        this.confServerChannel.show();
        this.confServerChannel.appendLine("---------------------------ERROR--------------------------");
        this.confServerChannel.appendLine("\n" + data);
        this.confServerChannel.appendLine("-----------------------END OF ERROR-----------------------");
    }

}
