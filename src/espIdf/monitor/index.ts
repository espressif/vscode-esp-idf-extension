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

import { EventEmitter } from "events";
import { ChildProcess, spawn, exec } from "child_process";
import { appendIdfAndToolsToPath } from "../../utils";
import { MonitorError } from "./errors";

export declare interface IDFMonitor {
  on(event: "data", listener: (data: Buffer) => void): this;
  on(event: "error", listener: (error: Error) => void): this;
}

export interface MonitorConfig {
  pythonBinPath: string;
  idfMonitorToolPath: string;
  port: string;
  baudRate: string;
  elfFilePath: string;
}

export enum MonitorType {
  CoreDump = "core-dump",
  GDBStub = "gdb-stub",
}

export class IDFMonitor extends EventEmitter {
  private server: ChildProcess;
  private config: MonitorConfig;
  private wsPort: number;
  constructor(config: MonitorConfig, wsPort: number) {
    super();
    this.config = config;
    this.wsPort = wsPort;
  }

  start(type: MonitorType) {
    const self = this;
    const env = appendIdfAndToolsToPath();
    const cmd = [
      this.config.pythonBinPath,
      this.config.idfMonitorToolPath,
      "-p",
      this.config.port,
      "-b",
      this.config.baudRate,
      this.config.elfFilePath,
    ].join(" ");
    this.server = exec(
      cmd,
      { env, shell: "/bin/bash" },
      (err, stdout, stderr) => {
        console.log(stderr);
        console.log(stdout);
        console.log(err);
      }
    );
    // this.server.stdout.on("data", (data) => {
    //   self.emit("data", data);
    // });
    // this.server.stderr.on("data", (data) => {
    //   self.emit("data", data);
    //   console.log(data.toString());
    // });
    // this.server.on("exit", (code, signal) => {
    //   if (code !== 0) {
    //     this.emit(
    //       "error",
    //       new MonitorError("idf_monitor.py exited with non zero code" + code)
    //     );
    //   }
    // });
  }

  close() {
    this.server.kill("SIGKILL");
  }
}
