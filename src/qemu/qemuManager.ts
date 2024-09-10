/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 30th June 2021 6:53:16 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
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

import { EventEmitter } from "events";
import {
  env,
  StatusBarAlignment,
  StatusBarItem,
  Terminal,
  Uri,
  window,
  workspace,
} from "vscode";
import { ESP } from "../config";
import { readParameter } from "../idfConfiguration";
import { Logger } from "../logger/logger";
import { appendIdfAndToolsToPath, isBinInPath, PreCheck } from "../utils";

export interface IQemuOptions {
  launchArgs: string[];
  tcpPort: string;
  workspaceFolder: Uri;
}

export class QemuManager extends EventEmitter {
  public static init(): QemuManager {
    if (!QemuManager.instance) {
      QemuManager.instance = new QemuManager();
    }
    return QemuManager.instance;
  }
  private static instance: QemuManager;
  private execString = "qemu-system-xtensa";
  private qemuTerminal: Terminal;
  private options: IQemuOptions;
  private _statusBarItem: StatusBarItem;

  private constructor() {
    super();
    this.configureWithDefValues();
  }

  public statusBarItem(): StatusBarItem {
    return this._statusBarItem;
  }

  public updateStatusText(text: string) {
    this._statusBarItem.text = text;
    this._statusBarItem.show();
  }

  public async commandHandler() {
    const pickItems = [];
    if (!QemuManager.instance.isRunning()) {
      pickItems.push({
        label: "Start QEMU",
        description: "",
      });
    } else {
      pickItems.push({
        label: "Stop QEMU",
        description: "",
      });
    }
    const selectedOption = await window.showQuickPick(pickItems);
    if (!selectedOption) {
      return;
    }

    try {
      switch (selectedOption.label) {
        case "Start QEMU":
          await QemuManager.instance.start();
          break;
        case "Stop QEMU":
          await QemuManager.instance.stop();
          break;
        default:
          break;
      }
    } catch (error) {
      const msg = error.message ? error.message : "";
      Logger.errorNotify(msg, error);
    }
  }

  public configure(config: IQemuOptions) {
    if (!this.options) {
      this.options = {} as IQemuOptions;
    }
    if (config.launchArgs) {
      this.options.launchArgs = config.launchArgs;
    }
    if (config.tcpPort) {
      this.options.tcpPort = config.tcpPort;
    }
    if (config.workspaceFolder) {
      this.options.workspaceFolder = config.workspaceFolder;
    }
    this.registerQemuStatusBarItem();
  }

  public configureWithDefValues() {
    let workspaceFolder: Uri;
    if (PreCheck.isWorkspaceFolderOpen()) {
      workspaceFolder = workspace.workspaceFolders[0].uri;
    }
    const defOptions = {
      launchArgs: [
        "-nographic",
        "-s",
        "-S",
        "-machine",
        "esp32",
        "-drive",
        "file=build/merged_qemu.bin,if=mtd,format=raw",
      ],
      tcpPort: readParameter("idf.qemuTcpPort", workspaceFolder),
      workspaceFolder,
    } as IQemuOptions;
    this.configure(defOptions);
  }

  public isRunning(): boolean {
    return !!this.qemuTerminal;
  }

  public async promptToQemuLaunch(): Promise<boolean> {
    if (QemuManager.instance && QemuManager.instance.isRunning()) {
      return true;
    }
    const launchQemuResponse = await window.showInformationMessage(
      "QEMU is not running, Do you want to execute it?",
      { modal: true },
      { title: "Yes" },
      { title: "Cancel", isCloseAffordance: true }
    );
    if (launchQemuResponse && launchQemuResponse.title === "Yes") {
      await QemuManager.init().start();
      return true;
    }
    return false;
  }

  public async start() {
    if (this.isRunning()) {
      return;
    }
    const modifiedEnv = appendIdfAndToolsToPath(this.options.workspaceFolder);
    const isQemuBinInPath = await isBinInPath(
      this.execString,
      this.options.workspaceFolder.fsPath,
      modifiedEnv
    );
    if (!isQemuBinInPath) {
      throw new Error("qemu-system-xtensa is not in PATH or access is denied");
    }
    if (typeof this.options === "undefined") {
      throw new Error("No QEMU options found.");
    }
    if (
      typeof this.options.launchArgs === "undefined" ||
      this.options.launchArgs.length < 1
    ) {
      throw new Error("No QEMU launch arguments found.");
    }
    if (typeof this.options.tcpPort === "undefined") {
      throw new Error("No QEMU tcp port for serial port was found.");
    }

    const qemuArgs: string[] = [];
    this.options.launchArgs.forEach((arg) => {
      qemuArgs.push(arg);
    });

    if (typeof this.qemuTerminal === "undefined") {
      this.qemuTerminal = window.createTerminal({
        name: "ESP-IDF QEMU",
        env: modifiedEnv,
        cwd:
          this.options.workspaceFolder.fsPath ||
          modifiedEnv.IDF_PATH ||
          process.cwd(),
        shellArgs: [],
        shellPath: env.shell,
        strictEnv: true,
      });
      window.onDidCloseTerminal((e) => {
        if (e.processId === this.qemuTerminal.processId) {
          this.stop();
        }
      });
    }
    this.qemuTerminal.sendText(`${this.execString} ${qemuArgs.join(" ")}`);
    this.qemuTerminal.show(true);
    this.updateStatusText("❇️ ESP-IDF: QEMU Server (Running)");
  }

  public stop() {
    if (!!this.qemuTerminal) {
      this.qemuTerminal.sendText(ESP.CTRL_RBRACKET);
      this.qemuTerminal.dispose();
      this.qemuTerminal = undefined;
    }
    this.updateStatusText("❌ ESP-IDF: QEMU Server (Stopped)");
  }

  public showOutputChannel(preserveFocus?: boolean) {
    if (this.qemuTerminal) {
      this.qemuTerminal.show(preserveFocus);
    }
  }

  private registerQemuStatusBarItem() {
    if (!this._statusBarItem) {
      this._statusBarItem = window.createStatusBarItem(
        StatusBarAlignment.Right,
        1005
      );
      this._statusBarItem.text = "[ESP-IDF: QEMU]";
      this._statusBarItem.command = "espIdf.qemuCommand";
      this._statusBarItem.show();
    }
  }
}
