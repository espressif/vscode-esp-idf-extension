/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 12th July 2019 5:59:07 pm
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
import * as vscode from "vscode";
import * as idfConf from "../../idfConfiguration";
import { Logger } from "../../logger/logger";
import { OutputChannel } from "../../logger/outputChannel";
import {
  appendIdfAndToolsToPath,
  isBinInPath,
  PreCheck,
  spawn as sspawn,
} from "../../utils";
import { TCLClient, TCLConnection } from "./tcl/tclClient";
import { ESP } from "../../config";

export interface IOpenOCDConfig {
  host: string;
  port: number;
  openOcdConfigFilesList: string[];
  workspace: vscode.Uri;
}

export class OpenOCDManager extends EventEmitter {
  public static init(): OpenOCDManager {
    if (!OpenOCDManager.instance) {
      OpenOCDManager.instance = new OpenOCDManager();
    }
    return OpenOCDManager.instance;
  }
  private static instance: OpenOCDManager;

  private openOcdConfigFilesList: string[];
  private server: ChildProcess;
  private chan: Buffer;
  private statusBar: vscode.StatusBarItem;
  private tclConnectionParams: TCLConnection;
  private workspace: vscode.Uri;
  private encounteredErrors: boolean = false;

  private constructor() {
    super();
    this.configureServerWithDefaultParam();
  }

  public async version(): Promise<string> {
    const modifiedEnv = appendIdfAndToolsToPath(this.workspace);
    if (!isBinInPath("openocd", this.workspace.fsPath, modifiedEnv)) {
      return "";
    }
    const resp = await sspawn("openocd", ["--version"], {
      cwd: this.workspace.fsPath,
      env: modifiedEnv,
    });
    const versionString = resp.toString();
    const match = versionString.match(/v\d+\.\d+\.\d+\-\S*/gi);
    if (!match) {
      return "failed+to+match+version";
    }
    return match[0].replace("-dirty", "");
  }

  public statusBarItem(): vscode.StatusBarItem {
    return this.statusBar;
  }

  public updateStatusText(text: string) {
    this.statusBar.text = text;
    this.statusBar.show();
  }

  public async commandHandler() {
    const openOCDCommandSelectionPick = [];
    if (!OpenOCDManager.instance.isRunning()) {
      openOCDCommandSelectionPick.push({
        label: "Start OpenOCD",
        description: "",
      });
    } else {
      openOCDCommandSelectionPick.push({
        label: "Stop OpenOCD",
        description: "Running",
      });
    }
    const pick = await vscode.window.showQuickPick(openOCDCommandSelectionPick);
    if (!pick) {
      return false;
    }
    try {
      switch (pick.label) {
        case "Start OpenOCD":
          await OpenOCDManager.instance.start();
          break;
        case "Stop OpenOCD":
          OpenOCDManager.instance.stop();
          break;
        default:
          break;
      }
    } catch (error) {
      Logger.errorNotify(error.message, error);
    }
    return true;
  }

  public configureServer(config: IOpenOCDConfig) {
    if (config.openOcdConfigFilesList) {
      this.openOcdConfigFilesList = config.openOcdConfigFilesList;
    }

    if (config.workspace) {
      this.workspace = config.workspace;
    }

    if (config.host) {
      this.tclConnectionParams.host = config.host;
    }

    if (config.port) {
      this.tclConnectionParams.port = config.port;
    }
  }

  public isRunning(): boolean {
    return this.server && !this.server.killed;
  }

  public async promptUserToLaunchOpenOCDServer(): Promise<boolean> {
    const tclClient = new TCLClient(this.tclConnectionParams);
    if (!(await tclClient.isOpenOCDServerRunning())) {
      const resp = await vscode.window.showInformationMessage(
        "OpenOCD is not running, do you want to launch it?",
        { modal: true },
        { title: "Yes" },
        { title: "Cancel", isCloseAffordance: true }
      );
      if (resp && resp.title === "Yes") {
        await OpenOCDManager.init().start();
        return await tclClient.isOpenOCDServerRunning();
      }
      return false;
    }
    return true;
  }

  public async start() {
    if (this.isRunning()) {
      return;
    }
    const modifiedEnv = appendIdfAndToolsToPath(this.workspace);
    if (!isBinInPath("openocd", this.workspace.fsPath, modifiedEnv)) {
      throw new Error(
        "Invalid OpenOCD bin path or access is denied for the user"
      );
    }
    if (typeof modifiedEnv.OPENOCD_SCRIPTS === "undefined") {
      throw new Error(
        "OPENOCD_SCRIPTS environment variable is missing. Please set it in idf.customExtraVars or in your system environment variables."
      );
    }

    if (
      typeof this.openOcdConfigFilesList === "undefined" ||
      this.openOcdConfigFilesList.length < 1
    ) {
      throw new Error(
        "Invalid OpenOCD Config files. Check idf.openOcdConfigs configuration value."
      );
    }

    const openOcdArgs = [];
    const openOcdDebugLevel = idfConf.readParameter(
      "idf.openOcdDebugLevel",
      this.workspace
    ) as string;
    openOcdArgs.push(`-d${openOcdDebugLevel}`);

    this.openOcdConfigFilesList.forEach((configFile) => {
      openOcdArgs.push("-f");
      openOcdArgs.push(configFile);
    });

    const addLaunchArgs = idfConf.readParameter(
      "idf.openOcdLaunchArgs",
      this.workspace
    ) as string[];

    if (addLaunchArgs && addLaunchArgs.length) {
      addLaunchArgs.forEach((arg) => {
        openOcdArgs.push(arg);
      });
    }

    this.server = spawn("openocd", openOcdArgs, {
      cwd: this.workspace.fsPath,
      env: modifiedEnv,
    });
    this.server.stderr.on("data", (data) => {
      this.encounteredErrors = true;
      data = typeof data === "string" ? Buffer.from(data) : data;
      this.sendToOutputChannel(data);
      const regex = /Error:.*/i;
      const errStr = data.toString();
      const matchArr = errStr.match(regex);
      if (!matchArr) {
        this.emit("data", this.chan);
      } else {
        const errorMsg = `OpenOCD server failed to start because of ${matchArr.join(
          " "
        )}`;
        const err = new Error(errorMsg);
        Logger.errorNotify(errorMsg + `\n❌ ${errStr}`, err);
        OutputChannel.appendLine(`❌ ${errStr}`, "OpenOCD");
        this.emit("error", err, this.chan);
      }
      OutputChannel.appendLine(errStr, "OpenOCD");
      Logger.info(errStr);
    });
    this.server.stdout.on("data", (data) => {
      data = typeof data === "string" ? Buffer.from(data) : data;
      this.sendToOutputChannel(data);
      this.emit("data", this.chan);
    });
    this.server.on("error", (error) => {
      this.emit("error", error, this.chan);
      this.stop();
    });
    this.server.on("close", (code: number, signal: string) => {
      if (this.encounteredErrors) {
        OutputChannel.appendLine(
          `For assistance with OpenOCD errors, please refer to our Troubleshooting FAQ: ${ESP.URL.OpenOcdTroubleshootingFaq}`,
          "OpenOCD"
        );
      }
      this.encounteredErrors = false;
      if (!signal && code && code !== 0) {
        Logger.errorNotify(
          `OpenOCD Exit with non-zero error code ${code}`,
          new Error("Spawn exit with non-zero" + code)
        );
      }
      this.stop();
    });
    this.updateStatusText("❇️ ESP-IDF: OpenOCD Server (Running)");
    OutputChannel.show();
  }

  public stop() {
    if (this.server && !this.server.killed) {
      this.server.kill("SIGKILL");
      this.server = undefined;
      this.updateStatusText("❌ ESP-IDF: OpenOCD Server (Stopped)");
      const endMsg = "[Stopped] : OpenOCD Server";
      OutputChannel.appendLine(endMsg, "OpenOCD");
      Logger.info(endMsg);
    }
  }

  public showOutputChannel(preserveFocus?: boolean) {
    preserveFocus ? OutputChannel.show() : null;
  }

  private registerOpenOCDStatusBarItem() {
    this.statusBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      1000
    );
    this.statusBar.text = "[ESP-IDF: OpenOCD Server]";
    this.statusBar.command = "espIdf.openOCDCommand";
    this.statusBar.show();
  }

  private configureServerWithDefaultParam() {
    const openOcdConfigFilesList = idfConf.readParameter(
      "idf.openOcdConfigs"
    ) as string[];
    if (PreCheck.isWorkspaceFolderOpen()) {
      this.workspace = vscode.workspace.workspaceFolders[0].uri;
    }
    const host = idfConf.readParameter("openocd.tcl.host", this.workspace);
    const port = idfConf.readParameter("openocd.tcl.port", this.workspace);
    this.openOcdConfigFilesList = openOcdConfigFilesList;
    this.chan = Buffer.alloc(0);
    OutputChannel.init();
    this.tclConnectionParams = { host, port };
    this.registerOpenOCDStatusBarItem();
  }

  private sendToOutputChannel(data: Buffer) {
    this.chan = Buffer.concat([this.chan, data]);
  }
}
