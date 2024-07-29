/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 10th June 2020 4:53:23 pm
 * Copyright 2020 Espressif Systems (Shanghai) CO LTD
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

import { ESP } from "../../config";
import { appendIdfAndToolsToPath, getUserShell } from "../../utils";
import { window, Terminal, Uri, env } from "vscode";

export interface MonitorConfig {
  baudRate: string;
  elfFilePath: string;
  idfMonitorToolPath: string;
  idfTarget: string;
  idfVersion: string;
  noReset: boolean;
  enableTimestamps: boolean;
  customTimestampFormat: string;
  port: string;
  pythonBinPath: string;
  toolchainPrefix: string;
  wsPort?: number;
  workspaceFolder: Uri;
  shellPath: string;
  shellExecutableArgs: string[];
}

export class IDFMonitor {
  public static config: MonitorConfig;
  public static terminal: Terminal;

  static updateConfiguration(config: MonitorConfig) {
    IDFMonitor.config = config;
  }

  static async start() {
    const modifiedEnv = await appendIdfAndToolsToPath(this.config.workspaceFolder);
    if (!IDFMonitor.terminal) {
      IDFMonitor.terminal = window.createTerminal({
        name: `ESP-IDF Monitor ${this.config.wsPort ? "(--ws enabled)" : ""}`,
        env: modifiedEnv,
        cwd:
          this.config.workspaceFolder.fsPath ||
          modifiedEnv.IDF_PATH ||
          process.cwd(),
        strictEnv: true,
        shellArgs: this.config.shellExecutableArgs || [],
        shellPath: this.config.shellPath || env.shell,
      });

      window.onDidCloseTerminal((e) => {
        if (e.processId === IDFMonitor.terminal.processId) {
          IDFMonitor.terminal = undefined;
        }
      });
    }
    IDFMonitor.terminal.show();
    const shellType = getUserShell();

    // Function to quote paths for PowerShell and correctly handle spaces for Bash
    const quotePath = (path) => {
      if (shellType.includes("powershell")) {
        return `'${path.replace(/'/g, "''")}'`;
      } else if (shellType.includes("cmd")) {
        return `"${path}"`;
      } else {
        return `'${path}'`;
      }
    };

    const baudRateToUse =
      this.config.baudRate ||
      modifiedEnv.IDF_MONITOR_BAUD ||
      modifiedEnv.MONITORBAUD ||
      "115200";
    const args = [
      quotePath(this.config.pythonBinPath),
      quotePath(this.config.idfMonitorToolPath),
      "-p",
      this.config.port,
      "-b",
      baudRateToUse,
      "--toolchain-prefix",
      this.config.toolchainPrefix,
    ];
    if (this.config.noReset && this.config.idfVersion >= "5.0") {
      args.splice(2, 0, "--no-reset");
    }
    if (this.config.enableTimestamps && this.config.idfVersion >= "4.4") {
      args.push("--timestamps");
    }
    if (
      this.config.customTimestampFormat.length > 0 &&
      this.config.idfVersion >= "4.4"
    ) {
      args.push(
        "--timestamp-format",
        JSON.stringify(this.config.customTimestampFormat)
      );
    }
    if (this.config.idfVersion >= "4.3") {
      args.push("--target", this.config.idfTarget);
    }
    if (this.config.wsPort) {
      args.push("--ws", `ws://localhost:${this.config.wsPort}`);
    }
    args.push(quotePath(this.config.elfFilePath));
    const envSetCmd = process.platform === "win32" ? "set" : "export";
    const quotedIdfPath = quotePath(modifiedEnv.IDF_PATH);

    if (shellType.includes("powershell")) {
      this.terminal.sendText(`& ${envSetCmd} IDF_PATH=${quotedIdfPath}`);
      this.terminal.sendText(`& ${args.join(" ")}`);
    } else if (shellType.includes("cmd")) {
      this.terminal.sendText(`${envSetCmd} IDF_PATH=${modifiedEnv.IDF_PATH}`);
      this.terminal.sendText(args.join(" "));
    } else {
      this.terminal.sendText(`${envSetCmd} IDF_PATH=${quotedIdfPath}`);
      this.terminal.sendText(args.join(" "));
    }

    return this.terminal;
  }

  static async dispose() {
    try {
      this.terminal.sendText(ESP.CTRL_RBRACKET);
      this.terminal.sendText(`exit`);
    } catch (error) {}
  }
}
