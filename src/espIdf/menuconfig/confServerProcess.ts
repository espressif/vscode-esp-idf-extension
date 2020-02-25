/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 21st June 2019 10:57:18 am
 * Copyright 2019 Espressif Systems (Shanghai) CO LTD
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ChildProcess, spawn } from "child_process";
import { EventEmitter } from "events";
import * as path from "path";
import * as vscode from "vscode";
import * as idfConf from "../../idfConfiguration";
import { Logger } from "../../logger/logger";
import { appendIdfAndToolsToPath, delConfigFile, isStringNotEmpty } from "../../utils";
import { KconfigMenuLoader } from "./kconfigMenuLoader";
import { Menu, menuType } from "./Menu";
import { MenuConfigPanel } from "./MenuconfigPanel";

export class ConfserverProcess {

    public static async init(workspaceFolder: vscode.Uri, extensionPath: string) {
        return new Promise((resolve) => {
            if (!ConfserverProcess.instance) {
                ConfserverProcess.instance = new ConfserverProcess(workspaceFolder, extensionPath);
            }
            ConfserverProcess.instance.emitter.once("valuesLoaded", resolve);
        });
    }

    public static exists() {
        return ConfserverProcess.instance && ConfserverProcess.instance.kconfigsMenus
            && ConfserverProcess.instance.kconfigsMenus.length > 0;
    }

    public static isSavedByUI() {
        return ConfserverProcess.instance.isSavingSdkconfig;
    }

    public static resetSavedByUI() {
        ConfserverProcess.instance.isSavingSdkconfig = false;
    }

    public static loadExistingInstance() {
        ConfserverProcess.checkInitialized();
        MenuConfigPanel.createOrShow(
            ConfserverProcess.instance.extensionPath,
            ConfserverProcess.instance.workspaceFolder,
            ConfserverProcess.instance.kconfigsMenus);
    }

    public static registerListener(listener: (values: string) => void) {
        ConfserverProcess.checkInitialized();
        ConfserverProcess.instance.jsonListener = listener;
    }

    public static registerProgress(progress: vscode.Progress<{ message: string, increment: number }>) {
        ConfserverProcess.progress = progress;
    }

    public static updateValues(values: string): Menu[] {
        ConfserverProcess.checkInitialized();
        const jsonValues = JSON.parse(values);
        const newKconfigMenus: Menu[] = [];
        for (const config of ConfserverProcess.instance.kconfigsMenus) {
            const resConfig = KconfigMenuLoader.updateValues(config, jsonValues);
            newKconfigMenus.push(resConfig);
        }
        ConfserverProcess.instance.kconfigsMenus = [];
        ConfserverProcess.instance.kconfigsMenus = newKconfigMenus;
        return ConfserverProcess.instance.kconfigsMenus;
    }

    public static setUpdatedValue(updatedValue: Menu) {
        let newValueRequest: string;
        switch (updatedValue.type) {
            case menuType.choice:
                newValueRequest = `{"version": 2, "set": { "${updatedValue.value}": true }}\n`;
                break;
            case menuType.string:
            case menuType.hex:
                newValueRequest = `{"version": 2, "set": { "${updatedValue.id}": "${updatedValue.value}" }}\n`;
                break;
            default:
                newValueRequest = `{"version": 2, "set": { "${updatedValue.id}": ${updatedValue.value} }}\n`;
                break;
        }
        ConfserverProcess.instance.confServerChannel.appendLine(newValueRequest);
        ConfserverProcess.instance.confServerProcess.stdin.write(newValueRequest);
        ConfserverProcess.instance.areValuesSaved = false;
    }

    public static saveGuiConfigValues() {
        ConfserverProcess.instance.isSavingSdkconfig = true;
        const saveRequest = JSON.stringify({ version: 2, save: ConfserverProcess.instance.configFile });
        ConfserverProcess.instance.confServerChannel.appendLine(saveRequest);
        ConfserverProcess.instance.confServerProcess.stdin.write(saveRequest);
        ConfserverProcess.instance.confServerProcess.stdin.write("\n");
        ConfserverProcess.instance.areValuesSaved = true;
    }

    public static loadGuiConfigValues(isClosingWithoutSaving?: boolean) {
        const loadRequest = JSON.stringify({ version: 2, load: ConfserverProcess.instance.configFile });
        ConfserverProcess.instance.confServerChannel.appendLine(loadRequest);
        ConfserverProcess.instance.confServerProcess.stdin.write(loadRequest);
        ConfserverProcess.instance.confServerProcess.stdin.write("\n");
        if (isClosingWithoutSaving) {
            ConfserverProcess.instance.areValuesSaved = true;
        }
    }

    public static setDefaultValues(progress: vscode.Progress<{ message: string, increment: number }>) {
        progress.report({ increment: 10, message: "Deleting current values..." });
        ConfserverProcess.instance.areValuesSaved = true;
        delConfigFile(ConfserverProcess.instance.workspaceFolder);
        const guiconfigEspPath = idfConf.readParameter("idf.espIdfPath") || process.env.IDF_PATH;
        const idfPyPath = path.join(guiconfigEspPath, "tools", "idf.py");
        appendIdfAndToolsToPath();
        const pythonBinPath = idfConf.readParameter("idf.pythonBinPath") as string;
        const getSdkconfigProcess = spawn(pythonBinPath, [idfPyPath, "-C",
            ConfserverProcess.instance.workspaceFolder.fsPath, "reconfigure"]);

        progress.report({ increment: 10, message: "Loading default values..." });

        return new Promise((resolve, reject) => {
            getSdkconfigProcess.stderr.on("data", (data) => {
                if (isStringNotEmpty(data.toString())) {
                    ConfserverProcess.instance.printError(data.toString());
                    reject();
                }
            });
            getSdkconfigProcess.stdout.on("data", (data) => {
                ConfserverProcess.instance.confServerChannel.appendLine(data.toString());
            });
            getSdkconfigProcess.on("exit", (code, signal) => {
                if (code !== 0) {
                    ConfserverProcess.instance.printError(
                        `When loading default values received exit signal: ${signal}, code : ${code}`);
                }
                ConfserverProcess.loadGuiConfigValues();
                progress.report({ increment: 70, message: "The end" });
                const loadMessage = "Loaded default settings in GUI menuconfig";
                Logger.infoNotify(loadMessage);
                resolve();
            });
        });

    }

    public static areValuesSaved() {
        return ConfserverProcess.instance.areValuesSaved;
    }

    public static dispose() {
        if (ConfserverProcess.instance) {
            ConfserverProcess.instance.confServerProcess.stdin.end();
            ConfserverProcess.instance.confServerProcess = null;
            ConfserverProcess.instance.confServerChannel.clear();
            ConfserverProcess.instance.confServerChannel.dispose();
            ConfserverProcess.instance.confServerChannel = null;
            ConfserverProcess.instance = null;
        }
    }

    private static instance: ConfserverProcess;
    private static progress: vscode.Progress<{ message: string, increment: number }>;

    private static checkInitialized() {
        if (!ConfserverProcess.instance) {
            throw new Error("Confserver is not initialized");
        }
    }

    private areValuesSaved: boolean = true;
    private confServerProcess: ChildProcess;
    private confServerChannel: vscode.OutputChannel;
    private espIdfPath: string;
    private emitter: EventEmitter;
    private isSavingSdkconfig: boolean = false;
    private jsonListener: (values: string) => void;
    private receivedDataBuffer: string = "";
    private configFile: string;
    private workspaceFolder: vscode.Uri;
    private extensionPath: string;
    private kconfigsMenus: Menu[];

    constructor(workspaceFolder: vscode.Uri, extensionPath: string) {
        this.workspaceFolder = workspaceFolder;
        this.extensionPath = extensionPath;
        this.emitter = new EventEmitter();
        this.espIdfPath = idfConf.readParameter("idf.espIdfPath").toString() || process.env.IDF_PATH;
        const pythonBinPath = idfConf.readParameter("idf.pythonBinPath") as string;
        this.configFile = path.join(workspaceFolder.fsPath, "sdkconfig");

        if (typeof this.confServerChannel === "undefined") {
            this.confServerChannel = vscode.window.createOutputChannel("ESP-IDF GUI Menuconfig");
        }
        process.env.IDF_TARGET = "esp32";
        process.env.PYTHONUNBUFFERED = "0";
        process.env.IDF_PATH = this.espIdfPath;
        const idfPath = path.join(this.espIdfPath, "tools", "idf.py");
        appendIdfAndToolsToPath();
        this.confServerProcess = spawn(pythonBinPath, [idfPath, "-C", workspaceFolder.fsPath, "confserver"]);
        ConfserverProcess.progress.report({ increment: 30, message: "Configuring server" });
        this.setupConfigServer();
        this.jsonListener = this.initMenuConfigPanel;
    }

    private checkIfJsonIsReceived() {
        const newValuesJsonReceived = this.receivedDataBuffer.match(/(\{[.\s\S]*?\}\})/g);
        if ( newValuesJsonReceived !== null && newValuesJsonReceived.length > 0) {
            const lastIndex = newValuesJsonReceived.length - 1;
            if (this.jsonListener) {
                ConfserverProcess.instance.emitter.emit("valuesLoaded");
                this.jsonListener(newValuesJsonReceived[lastIndex]);
            } else {
                this.printError("Confserver listener doesn't exist. Error with MenuconfigPanel?");
            }
            this.receivedDataBuffer = "";
        }
    }

    private initMenuConfigPanel(values: string) {
        const configLoader = new KconfigMenuLoader(this.workspaceFolder);
        // Kconfig configurations are built into JS Objects (Class Menu)
        // without values and visibility. Those are lazy loaded from confServerProcess
        const configObjects = configLoader.initMenuconfigServer();
        this.kconfigsMenus = [];
        const jsonValues = JSON.parse(values);
        for (const config of configObjects) {
            const resConfig = KconfigMenuLoader.updateValues(config, jsonValues);
            this.kconfigsMenus.push(resConfig);
        }

        MenuConfigPanel.createOrShow(this.extensionPath, this.workspaceFolder, this.kconfigsMenus);
    }

    private setupConfigServer() {
        this.confServerProcess.stdout.on("data", (data) => {
            this.receivedDataBuffer += data;
            ConfserverProcess.progress.report({ increment: 3, message: "Loading initial values..." });
            Logger.info(data.toString());
            this.confServerChannel.appendLine(data.toString());
            this.checkIfJsonIsReceived();
        });
        this.confServerProcess.stderr.on("data", (data) => {
            const dataStr = data.toString();
            const ignoreList = [
                "Server running, waiting for requests on stdin..",
                "Saving config to",
                "Loading config from",
                "The following config symbol(s) were not visible so were not updated"];

            if (isStringNotEmpty(dataStr)) {
                const regexPattern = new RegExp(ignoreList.join("|"));
                if (regexPattern.test(dataStr)) {
                    Logger.info(dataStr);
                    this.confServerChannel.appendLine(dataStr);
                } else {
                    this.printError(dataStr);
                }
            }
        });
        this.confServerProcess.on("error", (err) => {
            err.stack === null ? this.printError(err.message) : this.printError(err.stack);
        });
        this.confServerProcess.on("exit", (code, signal) => {
            if (code !== 0) {
                this.printError(`Received signal: ${signal} with code: ${code}`);
            }
        });
    }

    private printError(data: string) {
        this.confServerChannel.show();
        this.confServerChannel.appendLine("---------------------------ERROR--------------------------");
        this.confServerChannel.appendLine("\n" + data);
        this.confServerChannel.appendLine("-----------------------END OF ERROR-----------------------");
        Logger.error(data.toString(), new Error(data.toString()));
    }

}
