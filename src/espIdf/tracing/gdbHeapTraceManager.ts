/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 14th July 2021 2:51:09 pm
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
import { ensureDir, pathExists, writeFile } from "fs-extra";
import { join } from "path";
import { env, Uri, window } from "vscode";
import { readParameter } from "../../idfConfiguration";
import { Logger } from "../../logger/logger";
import { OutputChannel } from "../../logger/outputChannel";
import {
  appendIdfAndToolsToPath,
  getToolchainToolName,
  isBinInPath,
  PreCheck,
} from "../../utils";
import { getProjectName } from "../../workspaceConfig";
import { OpenOCDManager } from "../openOcd/openOcdManager";
import { AppTraceArchiveTreeDataProvider } from "./tree/appTraceArchiveTreeDataProvider";
import {
  AppTraceButtonType,
  AppTraceTreeDataProvider,
} from "./tree/appTraceTreeDataProvider";

export class GdbHeapTraceManager {
  private treeDataProvider: AppTraceTreeDataProvider;
  private archiveDataProvider: AppTraceArchiveTreeDataProvider;
  private childProcess: ChildProcess;
  private gdbinitFileName: string = "heaptrace-gdbinit";
  private workspace: Uri;

  constructor(
    treeDataProvider: AppTraceTreeDataProvider,
    archiveDataProvider: AppTraceArchiveTreeDataProvider
  ) {
    this.treeDataProvider = treeDataProvider;
    this.archiveDataProvider = archiveDataProvider;
    OutputChannel.init();
  }

  public async start(workspace: Uri) {
    try {
      const isOpenOcdLaunched = await OpenOCDManager.init().promptUserToLaunchOpenOCDServer();
      if (isOpenOcdLaunched) {
        this.showStopButton();
        ensureDir(join(workspace.fsPath, "trace"));
        const fileName = `file://${join(workspace.fsPath, "trace").replace(
          /\\/g,
          "/"
        )}/htrace_${new Date().getTime()}.svdat`;
        await this.createGdbinitFile(fileName, workspace.fsPath);
        const modifiedEnv = appendIdfAndToolsToPath(workspace);
        const idfTarget = modifiedEnv.IDF_TARGET || "esp32";
        const gdbTool = getToolchainToolName(idfTarget, "gdb");
        const isGdbToolInPath = await isBinInPath(
          gdbTool,
          workspace.fsPath,
          modifiedEnv
        );
        if (!isGdbToolInPath) {
          throw new Error(`${gdbTool} is not available in PATH.`);
        }
        const buildDirName = readParameter(
          "idf.buildDirectoryName",
          workspace
        ) as string;
        const buildExists = await pathExists(buildDirName);
        if (!buildExists) {
          throw new Error(`${buildDirName} doesn't exist. Build first.`);
        }
        const projectName = await getProjectName(buildDirName);
        const elfFilePath = join(buildDirName, `${projectName}.elf`);
        const elfFileExists = await pathExists(elfFilePath);
        if (!elfFileExists) {
          throw new Error(`${elfFilePath} doesn't exist.`);
        }
        this.childProcess = spawn(
          `${gdbTool} -x ${this.gdbinitFileName} "${elfFilePath}"`,
          [],
          {
            cwd: buildDirName,
            env: modifiedEnv,
            shell: env.shell,
          }
        );

        this.childProcess.stdout.on("data", (data) => {
          Logger.info(data.toString());
          this.errorHandler(data.toString());
        });

        this.childProcess.stderr.on("data", (data) => {
          Logger.info(data.toString());
          this.errorHandler(data.toString());
        });

        this.childProcess.on("error", (err) => {
          Logger.errorNotify(err.message, err);
          this.stop();
        });

        this.childProcess.on("exit", (code, signal) => {
          if (code && code !== 0) {
            const errMsg = `Heap tracing process exited with code ${code} and signal ${signal}`;
            Logger.errorNotify(errMsg, new Error(errMsg));
          }
        });
      }
    } catch (error) {
      const msg = error.message
        ? error.message
        : "Error starting GDB Heap Tracing";
      Logger.errorNotify(msg, error);
      OutputChannel.appendLine(msg, "GDB Heap Trace");
      this.stop();
    }
  }

  public async stop() {
    try {
      if (this.childProcess) {
        this.childProcess.stdin.end();
        this.childProcess.kill("SIGKILL");
        this.childProcess = null;
      }
      this.archiveDataProvider.populateArchiveTree();
      this.showStartButton();
    } catch (error) {
      const msg = error.message
        ? error.message
        : "Error stoping GDB Heap Tracing";
      Logger.errorNotify(msg, error);
    }
  }

  private showStopButton() {
    this.treeDataProvider.showStopButton(AppTraceButtonType.HeapTraceButton);
  }
  private showStartButton() {
    this.treeDataProvider.showStartButton(AppTraceButtonType.HeapTraceButton);
  }

  private errorHandler(dataReceived: string) {
    if (
      dataReceived.indexOf(`Function "heap_trace_start" not defined`) !== -1 ||
      dataReceived.indexOf(`Function "heap_trace_stop" not defined`) !== -1
    ) {
      Logger.infoNotify("Could not perform heap tracing.");
      this.stop();
    } else if (dataReceived.indexOf("Tracing is STOPPED") !== -1) {
      window.showInformationMessage("Heap tracing done");
      this.stop();
    }
  }

  private async createGdbinitFile(
    traceFilePath: string,
    workspaceFolder: string
  ) {
    let content = `set pagination off\ntarget remote :3333\n\nmon reset halt\nflushregs\n\n`;
    content += `tb heap_trace_start\ncommands\nmon esp sysview start ${traceFilePath}\n`;
    content += `c\nend\n\ntb heap_trace_stop\ncommands\nmon esp sysview stop\nend\n\nc`;
    const filePath = join(workspaceFolder, this.gdbinitFileName);
    await writeFile(filePath, content);
  }
}
