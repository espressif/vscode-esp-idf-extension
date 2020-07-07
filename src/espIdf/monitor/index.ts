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
import { window, Terminal } from "vscode";

export interface MonitorConfig {
  pythonBinPath: string;
  idfMonitorToolPath: string;
  port: string;
  baudRate: string;
  elfFilePath: string;
  wsPort: number;
}

export class IDFMonitor {
  private config: MonitorConfig;
  private terminal: Terminal;
  constructor(config: MonitorConfig) {
    this.config = config;
  }
  start() {
    const env = appendIdfAndToolsToPath();
    this.terminal = window.createTerminal({
      name: `ESP-IDF Monitor (--ws enabled)`,
      env,
    });
    this.terminal.show();
    this.terminal.dispose = this.dispose.bind(this);
    const args = [
      this.config.pythonBinPath,
      this.config.idfMonitorToolPath,
      "-p",
      this.config.port,
      "-b",
      this.config.baudRate,
      "--ws",
      `ws://localhost:${this.config.wsPort}`,
    ];
    args.push(this.config.elfFilePath);
    this.terminal.sendText(args.join(" "));
  }
  async dispose() {
    process.kill(await this.terminal.processId);
  }
}
