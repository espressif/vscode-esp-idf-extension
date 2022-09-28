/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 10th June 2020 4:53:23 pm
 * Copyright 2020 Espressif Systems (Shanghai) CO LTD
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

import { appendIdfAndToolsToPath } from "../../utils";
import { window, Terminal, Uri, env } from "vscode";

export interface MonitorConfig {
  baudRate: string;
  elfFilePath: string;
  idfMonitorToolPath: string;
  idfTarget: string;
  idfVersion: string;
  port: string;
  pythonBinPath: string;
  toolchainPrefix: string;
  wsPort?: number;
  workspaceFolder: Uri;
}

export class IDFMonitor {
  private config: MonitorConfig;
  private terminal: Terminal;
  constructor(config: MonitorConfig) {
    this.config = config;
  }

  start() {
    const modifiedEnv = appendIdfAndToolsToPath(this.config.workspaceFolder);
    this.terminal = window.createTerminal({
      name: `ESP-IDF Monitor ${this.config.wsPort ? "(--ws enabled)" : ""}`,
      env: modifiedEnv,
      cwd:
        this.config.workspaceFolder.fsPath ||
        modifiedEnv.IDF_PATH ||
        process.cwd(),
      strictEnv: true,
      shellArgs: [],
      shellPath: env.shell,
    });
    this.terminal.show();
    this.terminal.dispose = this.dispose.bind(this);
    const baudRateToUse =
      modifiedEnv.IDF_MONITOR_BAUD ||
      modifiedEnv.MONITORBAUD ||
      this.config.baudRate ||
      "115200";
    const args = [
      this.config.pythonBinPath,
      this.config.idfMonitorToolPath,
      "-p",
      this.config.port,
      "-b",
      baudRateToUse,
      "--toolchain-prefix",
      this.config.toolchainPrefix,
    ];
    if (this.config.idfVersion >= "4.2") {
      args.push("--target", this.config.idfTarget);
    }
    if (this.config.wsPort) {
      args.push("--ws", `ws://localhost:${this.config.wsPort}`);
    }
    args.push(this.config.elfFilePath);
    const envSetCmd = process.platform === "win32" ? "set" : "export";
    this.terminal.sendText(`${envSetCmd} IDF_PATH=${modifiedEnv.IDF_PATH}`);
    this.terminal.sendText(args.join(" "));
    return this.terminal;
  }
  async dispose() {
    try {
      process.kill(await this.terminal.processId);
    } catch (error) {}
  }
}
