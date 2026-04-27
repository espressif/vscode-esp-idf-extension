/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 21st June 2019 10:57:18 am
 * Copyright 2019 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
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
import * as idfConf from "../../../idfConfiguration";
import { Logger } from "../../../logger/logger";
import { OutputChannel } from "../../../logger/outputChannel";
import { delConfigFile, isStringNotEmpty } from "../../../utils";
import { KconfigMenuLoader } from "../kconfigMenus/loader";
import { Menu } from "../Menu";
import { MenuConfigPanel } from "../panel/panel";
import { getVirtualEnvPythonPath } from "../../../pythonManager";
import { configureEnvVariables } from "../../../common/prepareEnv";
import { ESP } from "../../../config";
import { getSDKConfigFilePath } from "../../../workspaceConfig";
import {
  parseConfserverJsonChunk,
  ConfserverJsonStreamResult,
} from "./streamJsonParser";
import {
  buildLoadRequest,
  buildResetRequest,
  buildSaveRequest,
  buildSetRequest,
} from "./protocol";
import { buildConfserverArgs, buildReconfigureArgs } from "./idfPyArgsBuilder";
import {
  parseConfserverValues,
  updateMenusWithValues,
} from "../kconfigMenus/kconfigMenuUpdater";

export class ConfserverProcess {
  public static async initWithProgress(
    workspace: vscode.Uri,
    extensionPath: string
  ) {
    if (!this.exists()) {
      const notificationMode = idfConf.readParameter(
        "idf.notificationMode",
        workspace
      ) as string;
      const progressLocation =
        notificationMode === idfConf.NotificationMode.All ||
        notificationMode === idfConf.NotificationMode.Notifications
          ? vscode.ProgressLocation.Notification
          : vscode.ProgressLocation.Window;
      await vscode.window.withProgress(
        {
          cancellable: true,
          location: progressLocation,
          title: "ESP-IDF: Starting SDK Configuration process",
        },
        async (
          progress: vscode.Progress<{ message: string; increment: number }>,
          cancelToken: vscode.CancellationToken
        ) => {
          ConfserverProcess.registerProgress(progress);
          cancelToken.onCancellationRequested(() => {
            ConfserverProcess.dispose();
          });
          await ConfserverProcess.init(workspace, extensionPath);
        }
      );
    }
  }

  public static async init(workspaceFolder: vscode.Uri, extensionPath: string) {
    const modifiedEnv = await configureEnvVariables(workspaceFolder);
    if (!ConfserverProcess.instance) {
      ConfserverProcess.instance = new ConfserverProcess(
        workspaceFolder,
        extensionPath,
        modifiedEnv
      );
    }
    await new Promise<void>((resolve) => {
      ConfserverProcess.instance!.emitter.once("valuesLoaded", () => resolve());
    });
    ConfserverProcess.instance.sdkconfigResolvedPath = await getSDKConfigFilePath(
      workspaceFolder
    );
  }

  public static exists() {
    return (
      ConfserverProcess.instance &&
      ConfserverProcess.instance.kconfigsMenus &&
      ConfserverProcess.instance.kconfigsMenus.length > 0
    );
  }

  public static isSavedByUI() {
    return ConfserverProcess.instance?.isSavingSdkconfig;
  }

  public static resetSavedByUI() {
    if (ConfserverProcess.instance) {
      ConfserverProcess.instance.isSavingSdkconfig = false;
    }
  }

  public static loadExistingInstance() {
    ConfserverProcess.checkInitialized();
    if (ConfserverProcess.instance) {
      MenuConfigPanel.createOrShow(
        ConfserverProcess.instance.extensionPath,
        ConfserverProcess.instance.workspaceFolder,
        ConfserverProcess.instance.kconfigsMenus
      );
    }
  }

  public static registerListener(listener: (values: string) => void) {
    ConfserverProcess.checkInitialized();
    if (!ConfserverProcess.instance) {
      return;
    }
    ConfserverProcess.instance.jsonListener = listener;
  }

  public static registerProgress(
    progress: vscode.Progress<{ message: string; increment: number }>
  ) {
    ConfserverProcess.progress = progress;
  }

  public static updateValues(values: string): Menu[] {
    ConfserverProcess.checkInitialized();
    if (!ConfserverProcess.instance) {
      return [];
    }
    const jsonValues = parseConfserverValues(values);
    ConfserverProcess.instance.kconfigsMenus = updateMenusWithValues(
      ConfserverProcess.instance.kconfigsMenus,
      jsonValues
    );
    return ConfserverProcess.instance.kconfigsMenus;
  }

  public static resetElementById(id: string) {
    ConfserverProcess.sendUpdatedValue(buildResetRequest([id]));
  }

  public static resetElementChildren(children: string[]) {
    ConfserverProcess.sendUpdatedValue(buildResetRequest(children));
  }

  public static setUpdatedValue(updatedValue: Menu) {
    ConfserverProcess.sendUpdatedValue(buildSetRequest(updatedValue));
  }

  public static sendUpdatedValue(newValueRequest: string) {
    OutputChannel.appendLine(newValueRequest, "SDK Configuration Editor");
    if (ConfserverProcess.instance) {
      ConfserverProcess.instance?.confServerProcess?.stdin?.write(
        newValueRequest
      );
      ConfserverProcess.instance.areValuesSaved = false;
    } else {
      OutputChannel.appendLine(
        "No instance available",
        "SDK Configuration Editor"
      );
    }
  }

  public static saveGuiConfigValues() {
    if (!ConfserverProcess.instance) {
      return;
    }
    ConfserverProcess.instance.isSavingSdkconfig = true;
    const configFile = ConfserverProcess.instance.readSdkconfigFilePath();
    const saveRequest = buildSaveRequest(configFile);
    OutputChannel.appendLine(saveRequest, "SDK Configuration Editor");
    ConfserverProcess.instance.confServerProcess?.stdin?.write(saveRequest);
    ConfserverProcess.instance.areValuesSaved = true;
  }

  public static loadGuiConfigValues(isClosingWithoutSaving?: boolean) {
    if (!ConfserverProcess.instance) {
      return;
    }
    const configFile = ConfserverProcess.instance.readSdkconfigFilePath();
    const loadRequest = buildLoadRequest(configFile);
    OutputChannel.appendLine(loadRequest, "SDK Configuration Editor");
    ConfserverProcess.instance.confServerProcess?.stdin?.write(loadRequest);
    if (isClosingWithoutSaving) {
      ConfserverProcess.instance.areValuesSaved = true;
    }
  }

  public static async setDefaultValues(
    extensionPath: string,
    progress: vscode.Progress<{ message: string; increment: number }>
  ) {
    if (!ConfserverProcess.instance) {
      return;
    }
    progress.report({ increment: 10, message: "Deleting current values..." });
    ConfserverProcess.instance.areValuesSaved = true;
    const currWorkspace = ConfserverProcess.instance.workspaceFolder;
    await delConfigFile(currWorkspace);
    const currentEnvVars = ESP.ProjectConfiguration.store.get<{
      [key: string]: string;
    }>(ESP.ProjectConfiguration.CURRENT_IDF_CONFIGURATION, {});
    const guiconfigEspPath = currentEnvVars["IDF_PATH"];
    const idfPyPath = path.join(guiconfigEspPath, "tools", "idf.py");
    const modifiedEnv = await configureEnvVariables(currWorkspace);
    const pythonBinPath = await getVirtualEnvPythonPath();
    if (!pythonBinPath) {
      throw new Error(
        "Python binary path not found. Please check your Python configuration."
      );
    }
    const enableCCache = idfConf.readParameter(
      "idf.enableCCache",
      currWorkspace
    ) as boolean;
    const sdkconfigDefaults =
      (idfConf.readParameter(
        "idf.sdkconfigDefaults",
        currWorkspace
      ) as string[]) || [];

    const sdkconfigFile = idfConf.readParameter(
      "idf.sdkconfigFilePath",
      currWorkspace
    ) as string;
    const reconfigureArgs = buildReconfigureArgs(idfPyPath, {
      enableCCache,
      workspacePath: currWorkspace.fsPath,
      sdkconfigFile,
      sdkconfigDefaults,
    });
    await delConfigFile(currWorkspace);

    const getSdkconfigProcess = spawn(pythonBinPath, reconfigureArgs, {
      env: modifiedEnv,
    });

    progress.report({ increment: 10, message: "Loading default values..." });

    return new Promise<void>((resolve, reject) => {
      getSdkconfigProcess.stderr.on("data", (data) => {
        if (isStringNotEmpty(data.toString())) {
          OutputChannel.appendLine(data.toString(), "SDK Configuration Editor");
          Logger.info(data.toString());
          reject();
        }
      });
      getSdkconfigProcess.stdout.on("data", (data) => {
        OutputChannel.appendLine(data.toString(), "SDK Configuration Editor");
        Logger.info(data.toString());
      });
      getSdkconfigProcess.on("exit", (code, signal) => {
        if (code !== 0) {
          const errorMsg = `When loading default values received exit signal: ${signal}, code : ${code}`;
          OutputChannel.appendLine(errorMsg, "SDK Configuration Editor");
          Logger.error(
            errorMsg,
            new Error(errorMsg),
            "ConfserverProcess setDefaultValues"
          );
        }
        ConfserverProcess.init(currWorkspace, extensionPath);
        progress.report({ increment: 70, message: "The end" });
        const loadMessage = "Loaded default settings in GUI menuconfig";
        Logger.info(loadMessage);
        resolve();
      });
    });
  }

  public static areValuesSaved() {
    return ConfserverProcess.instance
      ? ConfserverProcess.instance.areValuesSaved
      : true;
  }

  public static dispose() {
    if (ConfserverProcess.instance) {
      const proc = ConfserverProcess.instance.confServerProcess;
      if (proc) {
        proc.stdout?.removeAllListeners();
        proc.stderr?.removeAllListeners();
        proc.removeAllListeners();
        proc.stdin?.destroy();
        proc.kill("SIGTERM");
      }
      ConfserverProcess.instance.confServerProcess = null;
      ConfserverProcess.instance = null;
    }
    if (MenuConfigPanel.currentPanel) {
      MenuConfigPanel.currentPanel.dispose();
    }
  }
  public static confserverVersion: number = 2;

  private static instance: ConfserverProcess | null = null;
  private static progress: vscode.Progress<{
    message: string;
    increment: number;
  }>;

  private static checkInitialized() {
    if (!ConfserverProcess.instance) {
      throw new Error("Confserver is not initialized");
    }
  }

  private areValuesSaved: boolean = true;
  /** Set in `init` after first `valuesLoaded` and `getSDKConfigFilePath`. */
  private sdkconfigResolvedPath: string | undefined;
  private confServerProcess: ChildProcess | null;
  private emitter: EventEmitter;
  private isSavingSdkconfig: boolean = false;
  private jsonListener: (values: string) => void;
  private receivedDataBuffer: string = "";
  private workspaceFolder: vscode.Uri;
  private extensionPath: string;
  private kconfigsMenus: Menu[] = [];

  constructor(
    workspaceFolder: vscode.Uri,
    extensionPath: string,
    modifiedEnv: { [key: string]: string }
  ) {
    this.workspaceFolder = workspaceFolder;
    this.extensionPath = extensionPath;
    this.emitter = new EventEmitter();
    const currentEnvVars = ESP.ProjectConfiguration.store.get<{
      [key: string]: string;
    }>(ESP.ProjectConfiguration.CURRENT_IDF_CONFIGURATION, {});
    const espIdfPath = currentEnvVars["IDF_PATH"];

    modifiedEnv.PYTHONUNBUFFERED = "0";
    const idfPath = path.join(espIdfPath, "tools", "idf.py");
    const enableCCache = idfConf.readParameter(
      "idf.enableCCache",
      workspaceFolder
    ) as boolean;
    const buildDirPath = idfConf.readParameter(
      "idf.buildPath",
      workspaceFolder
    ) as string;
    const sdkconfigDefaults =
      (idfConf.readParameter(
        "idf.sdkconfigDefaults",
        workspaceFolder
      ) as string[]) || [];

    const sdkconfigFile = idfConf.readParameter(
      "idf.sdkconfigFilePath",
      workspaceFolder
    ) as string;
    const confServerArgs = buildConfserverArgs(idfPath, {
      enableCCache,
      workspacePath: workspaceFolder.fsPath,
      buildDirPath,
      sdkconfigFile,
      sdkconfigDefaults,
    });

    const pythonBinPath = getVirtualEnvPythonPath();
    if (!pythonBinPath) {
      throw new Error(
        "Python binary path not found. Please check your Python configuration."
      );
    }
    this.confServerProcess = spawn(pythonBinPath, confServerArgs, {
      env: modifiedEnv,
    });
    if (ConfserverProcess.progress) {
      ConfserverProcess.progress.report({
        increment: 30,
        message: "Configuring server",
      });
    }
    this.setupConfigServer();
    this.jsonListener = this.initMenuConfigPanel;
  }

  private readSdkconfigFilePath(): string {
    if (this.sdkconfigResolvedPath) {
      return this.sdkconfigResolvedPath;
    }
    const fromSettings = idfConf.readParameter(
      "idf.sdkconfigFilePath",
      this.workspaceFolder
    ) as string;
    return fromSettings || path.join(this.workspaceFolder.fsPath, "sdkconfig");
  }

  private checkIfJsonIsReceived() {
    const streamResult: ConfserverJsonStreamResult = parseConfserverJsonChunk(
      "",
      this.receivedDataBuffer
    );
    this.receivedDataBuffer = streamResult.remainingBuffer;
    if (streamResult.latestJson) {
      if (this.jsonListener) {
        ConfserverProcess.instance?.emitter.emit("valuesLoaded");
        this.jsonListener(streamResult.latestJson);
      } else {
        this.printError(
          "Confserver listener doesn't exist. Error with MenuconfigPanel?"
        );
      }
    }
  }

  private initMenuConfigPanel(values: string) {
    const configLoader = new KconfigMenuLoader(this.workspaceFolder);
    // Kconfig configurations are built into JS Objects (Class Menu)
    // without values and visibility. Those are lazy loaded from confServerProcess
    const configObjects = configLoader.initMenuconfigServer();
    const jsonValues = parseConfserverValues(values);
    this.kconfigsMenus = updateMenusWithValues(configObjects, jsonValues);

    if (jsonValues && jsonValues.version) {
      ConfserverProcess.confserverVersion = jsonValues.version;
    }

    MenuConfigPanel.createOrShow(
      this.extensionPath,
      this.workspaceFolder,
      this.kconfigsMenus
    );
  }

  private setupConfigServer() {
    this.confServerProcess?.stdout?.on("data", (data) => {
      this.receivedDataBuffer += data;
      if (ConfserverProcess.progress) {
        ConfserverProcess.progress.report({
          increment: 3,
          message: "Loading initial values...",
        });
      }
      Logger.info(data.toString());
      OutputChannel.appendLine(data.toString(), "SDK Configuration Editor");
      this.checkIfJsonIsReceived();
    });
    this.confServerProcess?.stderr?.on("data", (data) => {
      const dataStr = data.toString();
      const ignoreList = [
        "Server running, waiting for requests on stdin..",
        "Saving config to",
        "Loading config from",
        "The following config symbol(s) were not visible so were not updated",
        "WARNING:",
      ];

      if (isStringNotEmpty(dataStr)) {
        const regexPattern = new RegExp(ignoreList.join("|"));
        if (regexPattern.test(dataStr)) {
          Logger.info(dataStr);
          OutputChannel.appendLine(dataStr, "SDK Configuration Editor");
        } else {
          this.printError(dataStr);
        }
      }
    });
    this.confServerProcess?.on("error", (err) => {
      err.stack
        ? this.printError(err.message + "\n" + err.stack)
        : this.printError(err.message);
    });
    this.confServerProcess?.on("exit", (code, signal) => {
      if (code !== 0) {
        this.printError(
          `SDK Configuration editor confserver process exited with code: ${code}`
        );
      }
      ConfserverProcess.dispose();
    });
  }

  private printError(data: string) {
    OutputChannel.show();
    OutputChannel.appendLine(
      "---------------------------ERROR--------------------------",
      "SDK Configuration Editor"
    );
    OutputChannel.appendLine("\n" + data);
    OutputChannel.appendLine(
      "-----------------------END OF ERROR-----------------------"
    );
    Logger.error(
      data.toString(),
      new Error(data.toString()),
      "ConfserverProcess printError"
    );
  }
}
