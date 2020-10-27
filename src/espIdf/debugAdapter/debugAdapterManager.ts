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
import {
  appendIdfAndToolsToPath,
  canAccessFile,
  isBinInPath,
  PreCheck,
} from "../../utils";
import { EOL } from "os";
import { outputFile, constants } from "fs-extra";

export interface IDebugAdapterConfig {
  coreDumpFile?: string;
  currentWorkspace?: vscode.Uri;
  debugAdapterPort?: number;
  elfFile?: string;
  env?: NodeJS.ProcessEnv;
  gdbinitFilePath?: string;
  initGdbCommands?: string[];
  isPostMortemDebugMode: boolean;
  logLevel?: number;
  target?: string;
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
  private coreDumpFile: string;
  private currentWorkspace: vscode.Uri;
  private debugAdapterPath: string;
  private displayChan: vscode.OutputChannel;
  private elfFile: string;
  private env;
  private gdbinitFilePath: string;
  private initGdbCommands: string[];
  private isPostMortemDebugMode: boolean;
  private logLevel: number;
  private port: number;
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
        return reject(
          new Error("Invalid OpenOCD bin path or access is denied for the user")
        );
      }
      if (this.env && typeof this.env.OPENOCD_SCRIPTS === "undefined") {
        return reject(
          new Error(
            "Invalid OpenOCD script path or access is denied for the user"
          )
        );
      }
      if (!canAccessFile(this.elfFile, constants.R_OK)) {
        return reject(new Error(`${this.elfFile} doesn't exist. Build first.`));
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
      if (this.isPostMortemDebugMode) {
        adapterArgs.push("-pm");
      }
      if (this.coreDumpFile) {
        adapterArgs.push("-c", this.coreDumpFile);
        adapterArgs.push("-om", "without_oocd");
      }
      const resultGdbInitFile = this.gdbinitFilePath
        ? this.gdbinitFilePath
        : await this.makeGdbinitFile();
      if (resultGdbInitFile) {
        adapterArgs.push("-x", resultGdbInitFile);
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
          return resolve(true);
        }
      });

      this.adapter.on("error", (error) => {
        this.emit("error", error, this.chan);
        this.stop();
        return reject(error);
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
    if (config.coreDumpFile) {
      this.coreDumpFile = config.coreDumpFile;
    }
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
    if (config.gdbinitFilePath) {
      this.gdbinitFilePath = config.gdbinitFilePath;
    }
    if (config.initGdbCommands) {
      this.initGdbCommands = config.initGdbCommands;
    }
    this.isPostMortemDebugMode = config.isPostMortemDebugMode;
    if (config.logLevel) {
      this.logLevel = config.logLevel;
    }
    if (config.target) {
      this.target = config.target;
    }
  }

  public isRunning(): boolean {
    return this.adapter && !this.adapter.killed;
  }

  private async configureWithDefaultValues(extensionPath: string) {
    this.currentWorkspace = PreCheck.isWorkspaceFolderOpen()
      ? vscode.workspace.workspaceFolders[0].uri
      : undefined;
    this.debugAdapterPath = path.join(
      extensionPath,
      "esp_debug_adapter",
      "debug_adapter_main.py"
    );
    this.isPostMortemDebugMode = false;
    this.port = 43474;
    this.logLevel = 0;
    this.target = idfConf.readParameter("idf.adapterTargetName");
    this.env = appendIdfAndToolsToPath();
    this.env.PYTHONPATH = path.join(
      extensionPath,
      "esp_debug_adapter",
      "debug_adapter"
    );
    this.initGdbCommands = [];
    this.elfFile = "";
    if (this.currentWorkspace) {
      this.elfFile = `${path.join(
        this.currentWorkspace.fsPath,
        "build",
        "project-name"
      )}.elf`;
    }
  }

  private sendToOutputChannel(data: Buffer) {
    this.chan = Buffer.concat([this.chan, data]);
  }

  private async makeGdbinitFile() {
    try {
      if (this.initGdbCommands && this.initGdbCommands.length > 0) {
        let result = "";
        for (const initCmd of this.initGdbCommands) {
          result = result + initCmd + EOL;
        }
        const lastValue = result.lastIndexOf(EOL);
        result = result.substring(0, lastValue);

        const resultGdbInitPath = path.join(
          this.currentWorkspace.fsPath,
          "esp-idf-vscode-generated.gdb"
        );
        await outputFile(resultGdbInitPath, result);
        return resultGdbInitPath;
      }
    } catch (error) {
      Logger.errorNotify("Error creating gdbinit file", error);
    }
    return;
  }
}
