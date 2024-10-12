/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 30th June 2021 6:53:16 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
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

import { EventEmitter } from "events";
import {
  env,
  StatusBarAlignment,
  StatusBarItem,
  Terminal,
  TreeItemCheckboxState,
  Uri,
  window,
} from "vscode";
import { ESP } from "../config";
import { readParameter } from "../idfConfiguration";
import { Logger } from "../logger/logger";
import { statusBarItems } from "../statusBar";
import {
  CommandKeys,
  createCommandDictionary,
} from "../cmdTreeView/cmdStore";
import { appendIdfAndToolsToPath, isBinInPath } from "../utils";

export enum QemuLaunchMode {
  Debug,
  Monitor,
}

export class QemuManager extends EventEmitter {
  public static init(): QemuManager {
    if (!QemuManager.instance) {
      QemuManager.instance = new QemuManager();
    }
    return QemuManager.instance;
  }
  private static instance: QemuManager;
  private qemuTerminal: Terminal;
  private _statusBarItem: StatusBarItem;

  private constructor() {
    super();
    this.registerQemuStatusBarItem();
  }

  public statusBarItem(): StatusBarItem {
    return this._statusBarItem;
  }

  public updateStatusText(text: string) {
    this._statusBarItem.text = text;
    this._statusBarItem.show();
  }

  public async commandHandler() {
    const pickItems = [
      {
        label: "Stop QEMU",
        description: "",
      },
    ];
    const selectedOption = await window.showQuickPick(pickItems);
    if (!selectedOption) {
      return;
    }
    try {
      switch (selectedOption.label) {
        case "Stop QEMU":
          QemuManager.instance.stop();
          break;
        default:
          break;
      }
    } catch (error) {
      const msg = error.message ? error.message : "";
      Logger.errorNotify(msg, error, "QemuManager commandHandler");
    }
  }

  public getLaunchArguments(
    mode: QemuLaunchMode,
    idfTarget: string,
    workspaceFolder: Uri
  ) {
    const buildPath = readParameter(
      "idf.buildPath",
      workspaceFolder
    ) as string;
    const qemuFile = Uri.joinPath(Uri.file(buildPath), "merged_qemu.bin");
    const qemuTcpPort = readParameter(
      "idf.qemuTcpPort",
      workspaceFolder
    ) as string;

    if (mode === QemuLaunchMode.Debug) {
      return [
        "-nographic",
        "-s",
        "-S",
        "-machine",
        idfTarget,
        "-drive",
        `file=${qemuFile.fsPath},if=mtd,format=raw`,
      ];
    } else {
      return [
        "-nographic",
        "-machine",
        idfTarget,
        "-drive",
        `file=${qemuFile.fsPath},if=mtd,format=raw`,
        "-monitor stdio",
        `-serial tcp::${qemuTcpPort},server,nowait`,
      ];
    }
  }

  public isRunning(): boolean {
    return !!this.qemuTerminal;
  }

  public async start(mode: QemuLaunchMode, workspaceFolder: Uri) {
    if (this.isRunning()) {
      return;
    }
    const modifiedEnv = await appendIdfAndToolsToPath(
      workspaceFolder
    );
    const qemuExecutable =
      modifiedEnv.IDF_TARGET === "esp32"
        ? "qemu-system-xtensa"
        : modifiedEnv.IDF_TARGET === "esp32c3"
        ? "qemu-system-riscv32"
        : "";
    if (!qemuExecutable) {
      throw new Error(
        `Current IDF_TARGET ${modifiedEnv.IDF_TARGET} is not supported in Espressif QEMU. Only esp32 or esp32c3`
      );
    }
    const isQemuBinInPath = await isBinInPath(
      qemuExecutable,
      workspaceFolder.fsPath,
      modifiedEnv
    );
    if (!isQemuBinInPath) {
      throw new Error(
        `${qemuExecutable} is not found in PATH or access is denied`
      );
    }

    const qemuArgs: string[] = this.getLaunchArguments(mode, modifiedEnv.IDF_TARGET, workspaceFolder);
    if (
      typeof qemuArgs === "undefined" ||
      qemuArgs.length < 1
    ) {
      throw new Error("No QEMU launch arguments found.");
    }

    if (typeof this.qemuTerminal === "undefined") {
      this.qemuTerminal = window.createTerminal({
        name: "ESP-IDF QEMU",
        env: modifiedEnv,
        cwd:
          workspaceFolder.fsPath ||
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
    this.qemuTerminal.sendText(`${qemuExecutable} ${qemuArgs.join(" ")}`);
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
      const commandDictionary = createCommandDictionary();
      this._statusBarItem.tooltip =
        commandDictionary[CommandKeys.QemuServer].tooltip;
      this._statusBarItem.command = CommandKeys.QemuServer;
      if (
        commandDictionary[CommandKeys.QemuServer]
          .checkboxState === TreeItemCheckboxState.Checked
      ) {
        this._statusBarItem.show();
      }
      statusBarItems["qemu"] = this._statusBarItem;
    }
  }
}
