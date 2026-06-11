/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 21st April 2026 3:31:57 pm
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
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

import { MonitorConfig } from "./types";
import { configureEnvVariables } from "../../common/prepareEnv";
import { ESP } from "../../config";
import { getUserShell } from "../../utils";
import { window, Terminal, env, debug, l10n } from "vscode";
import { WSServer } from "../communications/ws";
import {
  buildIdfMonitorQuotedInvokeTokens,
  buildIdfMonitorTerminalSendSequence,
  monitorShellKindFromUserShell,
  resolveMonitorBaudRate,
} from "./argsBuilder";

export class IDFMonitor {
  public static config: MonitorConfig;
  public static terminal: Terminal | undefined;

  static updateConfiguration(config: MonitorConfig) {
    IDFMonitor.config = config;
  }

  static async start() {
    const modifiedEnv = await configureEnvVariables(
      this.config.workspaceFolder.uri
    );
    if (!IDFMonitor.terminal) {
      IDFMonitor.terminal = window.createTerminal({
        name: `ESP-IDF Monitor ${this.config.wsPort ? "(--ws enabled)" : ""}`,
        env: modifiedEnv,
        cwd:
          this.config.workspaceFolder.uri.fsPath ||
          modifiedEnv.IDF_PATH ||
          process.cwd(),
        strictEnv: true,
        shellArgs: this.config.shellExecutableArgs || [],
        shellPath: this.config.shellPath || env.shell,
      });

      window.onDidCloseTerminal((e) => {
        if (e.processId === IDFMonitor.terminal?.processId) {
          IDFMonitor.terminal = undefined;
        }
      });
    }
    IDFMonitor.terminal.show();
    const shellKind = monitorShellKindFromUserShell(getUserShell());
    const baudRateToUse = resolveMonitorBaudRate(
      this.config.baudRate,
      modifiedEnv.IDF_MONITOR_BAUD,
      modifiedEnv.MONITORBAUD
    );
    const quotedTokens = buildIdfMonitorQuotedInvokeTokens({
      port: this.config.port,
      baudRate: baudRateToUse,
      pythonBinPath: this.config.pythonBinPath,
      idfMonitorToolPath: this.config.idfMonitorToolPath,
      idfTarget: this.config.idfTarget,
      idfVersion: this.config.idfVersion,
      noReset: this.config.noReset,
      enableTimestamps: this.config.enableTimestamps,
      customTimestampFormat: this.config.customTimestampFormat,
      toolchainPrefix: this.config.toolchainPrefix,
      elfFilePath: this.config.elfFilePath,
      wsPort: this.config.wsPort,
      idfPath: modifiedEnv.IDF_PATH,
      isDebugSessionActive: this.isDebugSessionActive(),
      shellKind,
    });
    const quotedInvokeJoined = quotedTokens.join(" ");
    const sequence = buildIdfMonitorTerminalSendSequence({
      shellKind,
      modifiedEnvIdfPath: modifiedEnv.IDF_PATH,
      quotedInvokeJoined,
    });
    IDFMonitor.terminal.sendText(sequence.texts[0]);
    if (sequence.delayMsAfterFirstLine !== undefined) {
      await new Promise((resolve) =>
        setTimeout(resolve, sequence.delayMsAfterFirstLine)
      );
    }
    for (let i = 1; i < sequence.texts.length; i++) {
      IDFMonitor.terminal.sendText(sequence.texts[i]);
    }

    return IDFMonitor.terminal;
  }

  static async dispose() {
    try {
      if (IDFMonitor.terminal) {
        IDFMonitor.terminal.sendText(ESP.CTRL_RBRACKET);
        IDFMonitor.terminal.sendText(`exit`);
      }
    } catch (error) {}
  }

  private static isDebugSessionActive(): boolean {
    return debug.activeDebugSession !== undefined;
  }
}
