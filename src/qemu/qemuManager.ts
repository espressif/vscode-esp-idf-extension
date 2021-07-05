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

import { ChildProcess, spawn } from "child_process";
import { EventEmitter } from "events";
import {
  OutputChannel,
  StatusBarAlignment,
  StatusBarItem,
  window,
  workspace,
} from "vscode";
import { readParameter } from "../idfConfiguration";
import { Logger } from "../logger/logger";
import { appendIdfAndToolsToPath, isBinInPath, PreCheck } from "../utils";

export interface IQemuOptions {
  launchArgs: string[];
  tcpPort: string;
}

export class QemuManager extends EventEmitter {
  public static init(config?: IQemuOptions): QemuManager {
    if (!QemuManager.instance) {
      QemuManager.instance = new QemuManager(config);
    }
    return QemuManager.instance;
  }
  private static instance: QemuManager;
  private execString = "qemu-system-xtensa";
  private server: ChildProcess;
  private chan: OutputChannel;
  private options: IQemuOptions;
  private _statusBarItem: StatusBarItem;

  private constructor(config?: IQemuOptions) {
    super();
    this.configure(config);
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
    if (config) {
      this.options = config;
    } else {
      const qemuLaunchOptions = readParameter("idf.qemuLaunchOptions");
      const qemuTcpPort = readParameter("idf.qemuTcpPort");
      this.options = {
        launchArgs: qemuLaunchOptions,
        tcpPort: qemuTcpPort,
      } as IQemuOptions;
    }
    this.chan = window.createOutputChannel("ESP-IDF: QEMU");
    this.registerOpenOCDStatusBarItem();
  }

  public isRunning(): boolean {
    return this.server && !this.server.killed;
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
    const modifiedEnv = appendIdfAndToolsToPath();
    const wsFolder = PreCheck.isWorkspaceFolderOpen()
      ? workspace.workspaceFolders[0].uri.fsPath
      : "";

    if (!isBinInPath(this.execString, wsFolder, modifiedEnv)) {
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

    const qemuArgs = [];
    this.options.launchArgs.forEach((arg) => {
      qemuArgs.push(arg);
    });
    qemuArgs.push(`-serial tcp::${this.options.tcpPort},server,nowait`);

    this.server = spawn(this.execString, qemuArgs, {
      cwd: wsFolder,
      env: modifiedEnv,
    });

    this.server.stderr.on("data", (data) => {
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
        this.chan.append(`❌ ${errStr}`);
        this.emit("error", err, this.chan);
      }
      this.chan.append(errStr);
    });

    this.server.stdout.on("data", (data) => {
      this.chan.append(data.toString());
      this.emit("data", this.chan);
    });
    this.server.on("error", (error) => {
      this.emit("error", error, this.chan);
      this.stop();
    });
    this.server.on("close", (code: number, signal: string) => {
      if (!signal && code && code !== 0) {
        Logger.errorNotify(
          `QEMU Exit with non-zero error code ${code}`,
          new Error("Spawn exit with non-zero" + code)
        );
      }
      this.stop();
    });
    this.updateStatusText("❇️ QEMU Server (Running)");
    this.chan.clear();
    this.chan.show(true);
  }

  public stop() {
    if (this.server && !this.server.killed) {
      this.server.kill("SIGKILL");
      this.server = undefined;
      this.updateStatusText("❌ QEMU Server (Stopped)");
      this.chan.appendLine("[Stopped] : QEMU Server");
    }
  }

  public showOutputChannel(preserveFocus?: boolean) {
    this.chan.show(preserveFocus);
  }

  private registerOpenOCDStatusBarItem() {
    this._statusBarItem = window.createStatusBarItem(
      StatusBarAlignment.Right,
      1005
    );
    this._statusBarItem.text = "[ESP-IDF QEMU]";
    this._statusBarItem.command = "espIdf.qemuCommand";
    this._statusBarItem.show();
  }
}
