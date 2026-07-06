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
import { Logger } from "../../../common/logger";
import { OutputChannel } from "../../../common/outputChannel";
import { handleError } from "../../../common/error/handler";
import { confserverProcessFailed } from "../../../common/error/knownError";
import { KconfigMenuLoader } from "../kconfigMenus/loader";
import { Menu } from "../Menu";
import { MenuConfigPanel } from "../panel/panel";
import { getCurrentIdfConfiguration } from "../../../configuration/env";
import { delConfigFile, getSDKConfigFilePath } from "../../../configuration/workspace";
import {
  parseConfserverJsonChunk,
  ConfserverJsonStreamResult,
} from "./streamJsonParser";
import {
  loadValueRequest,
  resetValueRequest,
  saveValueRequest,
  setValueRequest,
} from "./protocol";
import {
  parseConfserverValues,
  updateMenusWithValues,
} from "../kconfigMenus/kconfigMenuUpdater";
import {
  CancellationToken,
  Progress,
  ProgressLocation,
  Uri,
  window,
} from "vscode";
import { NotificationMode, readParameter } from "../../../configuration/idf";
import { join } from "path";
import { buildIdfPyConfigSubcommandArgs } from "../../common/idfPySubCmdBuilder";
import { menuconfigCommandErrorMapping } from "../errorMapping";
import { requireIdfPath, resolvePythonForIdfPy } from "../validation";

const CONFSERVER_COMMAND_ID = "espIdf.menuconfig.confserver";

function logSdkConfigEditorSubprocessLine(chunk: string): void {
  OutputChannel.appendLine(chunk, "SDK Configuration Editor");
  Logger.info(chunk);
}

export class ConfserverProcess {
  public static async initWithProgress(workspace: Uri, extensionPath: string) {
    if (!this.exists()) {
      const notificationMode = readParameter(
        "idf.notificationMode",
        workspace
      ) as string;
      const progressLocation =
        notificationMode === NotificationMode.All ||
        notificationMode === NotificationMode.Notifications
          ? ProgressLocation.Notification
          : ProgressLocation.Window;
      await window.withProgress(
        {
          cancellable: true,
          location: progressLocation,
          title: "ESP-IDF: Starting SDK Configuration process",
        },
        async (
          progress: Progress<{ message: string; increment: number }>,
          cancelToken: CancellationToken
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

  public static async init(workspaceFolder: Uri, extensionPath: string) {
    const modifiedEnv = getCurrentIdfConfiguration();
    if (!ConfserverProcess.instance) {
      const pythonBinPath = await resolvePythonForIdfPy();
      ConfserverProcess.instance = new ConfserverProcess(
        workspaceFolder,
        extensionPath,
        modifiedEnv,
        pythonBinPath
      );
    }
    await new Promise<void>((resolve, reject) => {
      const emitter = ConfserverProcess.instance!.emitter;
      emitter.once("valuesLoaded", () => resolve());
      emitter.once("valuesLoadFailed", (error: unknown) => {
        reject(error instanceof Error ? error : new Error(String(error)));
      });
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
    progress: Progress<{ message: string; increment: number }>
  ) {
    ConfserverProcess.progress = progress;
  }

  public static updateValues(values: string): Menu[] {
    ConfserverProcess.checkInitialized();
    if (!ConfserverProcess.instance) {
      return [];
    }
    const { menus } = ConfserverProcess.applyConfserverJsonToMenus(
      ConfserverProcess.instance.kconfigsMenus,
      values
    );
    ConfserverProcess.instance.kconfigsMenus = menus;
    return menus;
  }

  public static resetElementById(id: string) {
    ConfserverProcess.sendUpdatedValue(resetValueRequest([id]));
  }

  public static resetElementChildren(children: string[]) {
    ConfserverProcess.sendUpdatedValue(resetValueRequest(children));
  }

  public static setUpdatedValue(updatedValue: Menu) {
    ConfserverProcess.sendUpdatedValue(setValueRequest(updatedValue));
  }

  public static sendUpdatedValue(newValueRequest: string) {
    if (ConfserverProcess.instance) {
      ConfserverProcess.instance.writeConfserverRequest(newValueRequest);
      ConfserverProcess.instance.areValuesSaved = false;
    } else {
      OutputChannel.appendLine(newValueRequest, "SDK Configuration Editor");
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
    const saveRequest = saveValueRequest(configFile);
    ConfserverProcess.instance.writeConfserverRequest(saveRequest);
    ConfserverProcess.instance.areValuesSaved = true;
  }

  public static loadGuiConfigValues(isClosingWithoutSaving?: boolean) {
    if (!ConfserverProcess.instance) {
      return;
    }
    const configFile = ConfserverProcess.instance.readSdkconfigFilePath();
    const loadRequest = loadValueRequest(configFile);
    ConfserverProcess.instance.writeConfserverRequest(loadRequest);
    if (isClosingWithoutSaving) {
      ConfserverProcess.instance.areValuesSaved = true;
    }
  }

  public static async setDefaultValues(
    extensionPath: string,
    progress: Progress<{ message: string; increment: number }>
  ) {
    if (!ConfserverProcess.instance) {
      return;
    }
    progress.report({ increment: 10, message: "Deleting current values..." });
    ConfserverProcess.instance.areValuesSaved = true;
    const currWorkspace = ConfserverProcess.instance.workspaceFolder;
    const modifiedEnv = getCurrentIdfConfiguration();
    const idfRoot = requireIdfPath(modifiedEnv);
    const idfPyPath = join(idfRoot, "tools", "idf.py");
    const pythonBinPath = await resolvePythonForIdfPy();
    const reconfigureArgs = buildIdfPyConfigSubcommandArgs(
      idfPyPath,
      "reconfigure",
      currWorkspace
    );

    await delConfigFile(currWorkspace);

    const getSdkconfigProcess = spawn(pythonBinPath, reconfigureArgs, {
      env: modifiedEnv,
    });

    progress.report({ increment: 10, message: "Loading default values..." });

    return new Promise<void>((resolve, reject) => {
      let stderrAccumulator = "";
      let settled = false;

      const finishFailure = (err: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        reject(err);
      };

      const finishSuccess = async () => {
        if (settled) {
          return;
        }
        settled = true;
        try {
          await ConfserverProcess.init(currWorkspace, extensionPath);
          progress.report({ increment: 70, message: "The end" });
          const loadMessage = "Loaded default settings in GUI menuconfig";
          Logger.info(loadMessage);
          resolve();
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      };

      getSdkconfigProcess.stderr.on("data", (data) => {
        const chunk = data.toString();
        if (!!chunk.trim()) {
          stderrAccumulator += chunk;
          logSdkConfigEditorSubprocessLine(chunk);
        }
      });
      getSdkconfigProcess.stdout.on("data", (data) => {
        logSdkConfigEditorSubprocessLine(data.toString());
      });
      getSdkconfigProcess.on("error", (err) => {
        finishFailure(
          confserverProcessFailed("reconfigure", { detail: err.message })
        );
      });
      getSdkconfigProcess.on("exit", (code, signal) => {
        if (settled) {
          return;
        }
        if (code !== 0) {
          const detail = stderrAccumulator.trim() || undefined;
          finishFailure(
            confserverProcessFailed("reconfigure", {
              exitCode: code ?? undefined,
              signal,
              detail,
            })
          );
          return;
        }
        void finishSuccess();
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
  private static progress: Progress<{
    message: string;
    increment: number;
  }>;

  private static checkInitialized() {
    if (!ConfserverProcess.instance) {
      throw new Error("Confserver is not initialized");
    }
  }

  private static applyConfserverJsonToMenus(
    menus: Menu[],
    json: string
  ): { menus: Menu[]; parsed: ReturnType<typeof parseConfserverValues> } {
    const parsed = parseConfserverValues(json);
    return {
      menus: updateMenusWithValues(menus, parsed),
      parsed,
    };
  }

  private areValuesSaved: boolean = true;
  /** Set in `init` after first `valuesLoaded` and `getSDKConfigFilePath`. */
  private sdkconfigResolvedPath: string | undefined;
  private confServerProcess: ChildProcess | null;
  private emitter: EventEmitter;
  private isSavingSdkconfig: boolean = false;
  private jsonListener: (values: string) => void;
  private receivedDataBuffer: string = "";
  private workspaceFolder: Uri;
  private extensionPath: string;
  private kconfigsMenus: Menu[] = [];

  constructor(
    workspaceFolder: Uri,
    extensionPath: string,
    modifiedEnv: { [key: string]: string },
    pythonBinPath: string
  ) {
    this.workspaceFolder = workspaceFolder;
    this.extensionPath = extensionPath;
    this.emitter = new EventEmitter();
    const idfRoot = requireIdfPath(modifiedEnv);

    modifiedEnv.PYTHONUNBUFFERED = "0";
    const idfPath = join(idfRoot, "tools", "idf.py");
    const confServerArgs = buildIdfPyConfigSubcommandArgs(
      idfPath,
      "confserver",
      workspaceFolder
    );

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

  private writeConfserverRequest(request: string): void {
    OutputChannel.appendLine(request, "SDK Configuration Editor");
    this.confServerProcess?.stdin?.write(request);
  }

  private readSdkconfigFilePath(): string {
    if (this.sdkconfigResolvedPath) {
      return this.sdkconfigResolvedPath;
    }
    const fromSettings = readParameter(
      "idf.sdkconfigFilePath",
      this.workspaceFolder
    ) as string;
    return fromSettings || join(this.workspaceFolder.fsPath, "sdkconfig");
  }

  private checkIfJsonIsReceived() {
    const streamResult: ConfserverJsonStreamResult = parseConfserverJsonChunk(
      "",
      this.receivedDataBuffer
    );
    this.receivedDataBuffer = streamResult.remainingBuffer;
    if (streamResult.latestJson) {
      if (this.jsonListener) {
        this.jsonListener(streamResult.latestJson);
      } else {
        this.printError(
          "Confserver listener doesn't exist. Error with MenuconfigPanel?"
        );
      }
    }
  }

  private initMenuConfigPanel(values: string): void {
    void this.loadMenuConfigPanel(values);
  }

  private async loadMenuConfigPanel(values: string): Promise<void> {
    try {
      const configLoader = new KconfigMenuLoader(this.workspaceFolder);
      const configObjects = await configLoader.initMenuconfigServer();
      const { menus, parsed } = ConfserverProcess.applyConfserverJsonToMenus(
        configObjects,
        values
      );
      this.kconfigsMenus = menus;

      if (parsed && parsed.version) {
        ConfserverProcess.confserverVersion = parsed.version;
      }

      ConfserverProcess.instance?.emitter.emit("valuesLoaded");
      MenuConfigPanel.createOrShow(
        this.extensionPath,
        this.workspaceFolder,
        this.kconfigsMenus
      );
    } catch (error) {
      ConfserverProcess.instance?.emitter.emit("valuesLoadFailed", error);
      ConfserverProcess.dispose();
    }
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

      if (!!dataStr.trim()) {
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
      const detail = err.stack ? `${err.message}\n${err.stack}` : err.message;
      this.printError(detail);
      void handleError(
        CONFSERVER_COMMAND_ID,
        confserverProcessFailed("startup", { detail }),
        undefined,
        menuconfigCommandErrorMapping
      );
    });
    this.confServerProcess?.on("exit", (code, signal) => {
      if (code !== 0) {
        const msg = `SDK Configuration editor confserver process exited with code: ${code}`;
        this.printError(msg);
        void handleError(
          CONFSERVER_COMMAND_ID,
          confserverProcessFailed("runtime", {
            exitCode: code ?? undefined,
            signal,
          }),
          undefined,
          menuconfigCommandErrorMapping
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
