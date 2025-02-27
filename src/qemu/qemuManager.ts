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
  commands,
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
import { CommandKeys, createCommandDictionary } from "../cmdTreeView/cmdStore";
import { appendIdfAndToolsToPath, isBinInPath } from "../utils";
import { IdfToolsManager } from "../idfToolsManager";

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
        label: "QEMU Monitor",
        description: "",
      },
      {
        label: "QEMU Debug",
        description: "",
      },
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
        case "QEMU Monitor":
          commands.executeCommand("espIdf.monitorQemu");
          break;
        case "QEMU Debug":
          commands.executeCommand("espIdf.qemuDebug");
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
    const buildPath = readParameter("idf.buildPath", workspaceFolder) as string;
    const qemuFile = Uri.joinPath(Uri.file(buildPath), "merged_qemu.bin");
    const qemuTcpPort = readParameter(
      "idf.qemuTcpPort",
      workspaceFolder
    ) as string;
    const rawExtraArgs = readParameter("idf.qemuExtraArgs", workspaceFolder) as string[];

    let extraArgs: string[] = [];
    
    if (Array.isArray(rawExtraArgs)) extraArgs = rawExtraArgs;

    if (mode === QemuLaunchMode.Debug) {
      return [
        "-nographic",
        "-s",
        "-S",
        "-machine",
        idfTarget,
        "-drive",
        `file='${qemuFile.fsPath}',if=mtd,format=raw`,
        ...extraArgs,
      ];
    } else {
      return [
        "-nographic",
        "-machine",
        idfTarget,
        "-drive",
        `file='${qemuFile.fsPath}',if=mtd,format=raw`,
        "-monitor stdio",
        `-serial tcp::${qemuTcpPort},server,nowait`,
        ...extraArgs,
      ];
    }
  }

  public isRunning(): boolean {
    return !!this.qemuTerminal;
  }

  public async getQemuExecutable(idfPath: string) {
    const idfToolsManagerInstance = await IdfToolsManager.createIdfToolsManager(
      idfPath
    );
    const packages = await idfToolsManagerInstance.getPackageList(["qemu-xtensa", "qemu-riscv32"]);
    const xtensaPackage = packages.find((pkg) => {
      return pkg.name === "qemu-xtensa";
    });
    const risvPackage = packages.find((pkg) => {
      return pkg.name === "qemu-riscv32";
    });
    const qemuDictionary: { [key: string]: string } = {};
    for (const supportedTarget of xtensaPackage.supported_targets) {
      qemuDictionary[supportedTarget] = xtensaPackage.version_cmd[0];
    }
    for (const supportedTarget of risvPackage.supported_targets) {
      qemuDictionary[supportedTarget] = risvPackage.version_cmd[0];
    }
    // fallback for older versions
    if (Object.keys(qemuDictionary).length === 0) {
      qemuDictionary["esp32"] = "qemu-system-xtensa";
      qemuDictionary["esp32c3"] = "qemu-system-riscv32";
    }
    return qemuDictionary;
  }

  public async start(mode: QemuLaunchMode, workspaceFolder: Uri) {
    if (this.isRunning()) {
      return;
    }
    const modifiedEnv = await appendIdfAndToolsToPath(workspaceFolder);
    const qemuExecutableDict = await this.getQemuExecutable(
      modifiedEnv.IDF_PATH
    );
    const qemuExecutable = qemuExecutableDict[modifiedEnv.IDF_TARGET] || "";
    if (!qemuExecutable) {
      throw new Error(
        `${modifiedEnv.IDF_TARGET} is not supported by Espressif QEMU. Check ESP-IDF and QEMU version installed.`
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

    const qemuArgs: string[] = this.getLaunchArguments(
      mode,
      modifiedEnv.IDF_TARGET,
      workspaceFolder
    );
    if (typeof qemuArgs === "undefined" || qemuArgs.length < 1) {
      throw new Error("No QEMU launch arguments found.");
    }

    if (typeof this.qemuTerminal === "undefined") {
      this.qemuTerminal = window.createTerminal({
        name: "ESP-IDF QEMU",
        env: modifiedEnv,
        cwd: workspaceFolder.fsPath || modifiedEnv.IDF_PATH || process.cwd(),
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
        CommandKeys.QemuServer,
        StatusBarAlignment.Right,
        1005
      );
      this._statusBarItem.text = "[ESP-IDF: QEMU]";
      const commandDictionary = createCommandDictionary();
      this._statusBarItem.tooltip =
        commandDictionary[CommandKeys.QemuServer].tooltip;
      this._statusBarItem.command = CommandKeys.QemuServer;
      if (
        commandDictionary[CommandKeys.QemuServer].checkboxState ===
        TreeItemCheckboxState.Checked
      ) {
        this._statusBarItem.show();
      }
      statusBarItems["qemu"] = this._statusBarItem;
    }
  }
}
