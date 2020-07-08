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
import * as path from "path";
import * as vscode from "vscode";
import * as idfConf from "../../idfConfiguration";
import { Logger } from "../../logger/logger";
import { appendIdfAndToolsToPath, isBinInPath, PreCheck } from "../../utils";
import { getProjectName } from "../../workspaceConfig";

export interface IDebugAdapterConfig {
  currentWorkspace?: vscode.Uri;
  debugAdapterPort?: number;
  elfFile?: string;
  env?: NodeJS.ProcessEnv;
  logLevel?: number;
  isPostMortemDebugMode: boolean;
  target?: string;
  initGdbCommands?: string[];
}

export class DebugAdapterManager extends EventEmitter {
  public static init(context: vscode.ExtensionContext): DebugAdapterManager {
    if (!DebugAdapterManager.instance) {
      DebugAdapterManager.instance = new DebugAdapterManager(context);
    }
    return DebugAdapterManager.instance;
  }
  private static instance: DebugAdapterManager;

  private adapter: ChildProcess;
  private chan: Buffer;
  private currentWorkspace: vscode.Uri;
  private debugAdapterPath: string;
  private displayChan: vscode.OutputChannel;
  private elfFile: string;
  private env;
  private logLevel: number;
  private port: number;
  private isPostMortemDebugMode: boolean;
  private initGdbCommands: string[];
  private target: string;

  private constructor(context: vscode.ExtensionContext) {
    super();
    this.configureWithDefaultValues(context.extensionPath);
    this.displayChan = vscode.window.createOutputChannel(
      "ESP-IDF Debug Adapter"
    );
    this.chan = Buffer.alloc(0);
  }

  public start() {
    return new Promise(async (resolve, reject) => {
      if (this.isRunning()) {
        return;
      }
      const workspace = PreCheck.isWorkspaceFolderOpen()
        ? vscode.workspace.workspaceFolders[0].uri.fsPath
        : "";
      if (!isBinInPath("openocd", workspace, this.env)) {
        throw new Error(
          "Invalid OpenOCD bin path or access is denied for the user"
        );
      }
      if (typeof this.env.OPENOCD_SCRIPTS === "undefined") {
        throw new Error(
          "Invalid OpenOCD script path or access is denied for the user"
        );
      }
      const logFile = path.join(this.currentWorkspace.fsPath, "debug") + ".log";

      const pythonBinPath = idfConf.readParameter(
        "idf.pythonBinPath"
      ) as string;
      const adapterArgs = [
        this.debugAdapterPath,
        "-d",
        this.logLevel.toString(),
        "-e",
        this.elfFile,
        "-l",
        logFile,
        "-p",
        this.port.toString(),
        "-dn",
        this.target,
      ];
      this.isPostMortemDebugMode
        ? adapterArgs.push("-om", "without_oocd")
        : adapterArgs.push("-om", "connect_to_instance");
      if (this.isPostMortemDebugMode) {
        adapterArgs.push("--postmortem");
      }
      for (const setupCmd of this.initGdbCommands) {
        adapterArgs.push("--gdbinit", setupCmd);
      }
      this.adapter = spawn(pythonBinPath, adapterArgs, { env: this.env });

      this.adapter.stderr.on("data", (data) => {
        data = typeof data === "string" ? Buffer.from(data) : data;
        this.sendToOutputChannel(data);
        this.displayChan.append(data.toString());
        this.emit("error", data, this.chan);
      });

      this.adapter.stdout.on("data", (data) => {
        data = typeof data === "string" ? Buffer.from(data) : data;
        this.sendToOutputChannel(data);
        this.displayChan.append(data.toString());
        this.emit("data", this.chan);
        if (data.toString().trim().endsWith("DEBUG_ADAPTER_READY2CONNECT")) {
          resolve(true);
        }
      });

      this.adapter.on("error", (error) => {
        this.emit("error", error, this.chan);
        this.stop();
        reject();
      });

      this.adapter.on("close", (code: number, signal: string) => {
        if (!signal && code && code !== 0) {
          Logger.errorNotify(
            `ESP-IDF Debug Adapter exit with error code ${code}`,
            new Error("Spawn exit with non-zero" + code)
          );
        }
        this.stop();
      });
      this.displayChan.clear();
      this.displayChan.show(true);
    });
  }

  public stop() {
    if (this.adapter && !this.adapter.killed) {
      this.isPostMortemDebugMode = false;
      this.initGdbCommands = [];
      this.adapter.kill("SIGKILL");
      this.adapter = undefined;
      this.displayChan.appendLine("[Stopped] : ESP-IDF Debug Adapter");
    }
  }

  public configureAdapter(config: IDebugAdapterConfig) {
    if (config.currentWorkspace) {
      this.currentWorkspace = config.currentWorkspace;
    }
    if (config.debugAdapterPort) {
      this.port = config.debugAdapterPort;
    }
    if (config.elfFile) {
      this.elfFile = config.elfFile;
    }
    if (config.env) {
      for (const envVar of Object.keys(config.env)) {
        this.env[envVar] = config.env[envVar];
      }
    }
    if (config.logLevel) {
      this.logLevel = config.logLevel;
    }
    if (typeof config.isPostMortemDebugMode !== "undefined") {
      this.isPostMortemDebugMode = config.isPostMortemDebugMode;
    }
    if (config.target) {
      this.target = config.target;
    }
    if (config.initGdbCommands && config.initGdbCommands.length > 0) {
      this.initGdbCommands = config.initGdbCommands;
    }
  }

  public isRunning(): boolean {
    return this.adapter && !this.adapter.killed;
  }

  private async configureWithDefaultValues(extensionPath: string) {
    this.currentWorkspace = PreCheck.isWorkspaceFolderOpen()
      ? vscode.workspace.workspaceFolders[0].uri
      : undefined;
    const projectName = await getProjectName(this.currentWorkspace.fsPath);
    this.debugAdapterPath = path.join(
      extensionPath,
      "esp_debug_adapter",
      "debug_adapter_main.py"
    );
    this.isPostMortemDebugMode = false;
    this.port = 43474;
    this.logLevel = 0;
    this.target = idfConf.readParameter("idf.adapterTargetName");
    this.elfFile = `${path.join(
      this.currentWorkspace.fsPath,
      "build",
      projectName
    )}.elf`;
    this.env = appendIdfAndToolsToPath();
    this.env.PYTHONPATH = path.join(
      extensionPath,
      "esp_debug_adapter",
      "debug_adapter"
    );
    this.initGdbCommands = [];
  }

  private sendToOutputChannel(data: Buffer) {
    this.chan = Buffer.concat([this.chan, data]);
  }
}
