/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 14th July 2021 2:51:09 pm
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
import { ChildProcess, spawn } from "child_process";
import { ensureDir, writeFile } from "fs-extra";
import { join } from "path";
import { env, Uri, window } from "vscode";
import { handleError } from "../../common/error/handler";
import {
  heapTraceNotSupported,
  traceGdbProcessFailed,
} from "../../common/error/knownError";
import { OutputChannel } from "../../common/outputChannel";
import { getCurrentIdfConfiguration } from "../../configuration/env";
import { ensureOpenOcdServerRunning } from "../openOcd/openOcdLaunch";
import { AppTraceArchiveTreeDataProvider } from "./tree/appTraceArchiveTreeDataProvider";
import {
  AppTraceButtonType,
  AppTraceTreeDataProvider,
} from "./tree/appTraceTreeDataProvider";
import { heapTraceCommandErrorMapping } from "./errorMapping";
import { validateHeapTraceStartPrerequisites } from "./validation";

export class GdbHeapTraceManager {
  private treeDataProvider: AppTraceTreeDataProvider;
  private archiveDataProvider: AppTraceArchiveTreeDataProvider;
  private childProcess: ChildProcess | null = null;
  private gdbinitFileName: string = "heaptrace-gdbinit";
  private gdbFailureNotified: boolean = false;

  constructor(
    treeDataProvider: AppTraceTreeDataProvider,
    archiveDataProvider: AppTraceArchiveTreeDataProvider
  ) {
    this.treeDataProvider = treeDataProvider;
    this.archiveDataProvider = archiveDataProvider;
    OutputChannel.init();
  }

  public async start(workspace: Uri) {
    this.gdbFailureNotified = false;
    await ensureOpenOcdServerRunning(workspace);
    this.showStopButton();
    ensureDir(join(workspace.fsPath, "trace"));
    const fileName = `file://${join(workspace.fsPath, "trace").replace(
      /\\/g,
      "/"
    )}/htrace_${new Date().getTime()}.svdat`;
    const { buildDirPath, gdbTool, elfFilePath } =
      await validateHeapTraceStartPrerequisites(workspace);
    await this.createGdbinitFile(fileName, buildDirPath);
    const modifiedEnv = getCurrentIdfConfiguration();
    this.childProcess = spawn(
      `${gdbTool} -x ${this.gdbinitFileName} "${elfFilePath}"`,
      [],
      {
        cwd: buildDirPath,
        env: modifiedEnv,
        shell: env.shell,
      }
    );

    this.childProcess.stdout?.on("data", (data) => {
      this.errorHandler(data.toString());
    });

    this.childProcess.stderr?.on("data", (data) => {
      this.errorHandler(data.toString());
    });

    this.childProcess.on("error", (err) => {
      this.notifyGdbFailure({ detail: err.message });
      this.stop();
    });

    this.childProcess.on("exit", (code, signal) => {
      if (code && code !== 0) {
        this.notifyGdbFailure({
          exitCode: code,
          detail: `exit code ${code}, signal ${signal}`,
        });
      }
    });
  }

  public async stop() {
    if (this.childProcess) {
      this.childProcess.stdin?.write("quit\n");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (!this.childProcess.killed) {
        this.childProcess.kill("SIGKILL");
      }
      this.childProcess = null;
    }
    this.gdbFailureNotified = false;
    this.archiveDataProvider.populateArchiveTree();
    this.showStartButton();
  }

  private showStopButton() {
    this.treeDataProvider.showStopButton(AppTraceButtonType.HeapTraceButton);
  }
  private showStartButton() {
    this.treeDataProvider.showStartButton(AppTraceButtonType.HeapTraceButton);
  }

  private notifyGdbFailure(metadata: { exitCode?: number; detail?: string }): void {
    if (this.gdbFailureNotified) {
      return;
    }
    this.gdbFailureNotified = true;
    void handleError(
      "espIdf.heaptrace",
      traceGdbProcessFailed(metadata),
      undefined,
      heapTraceCommandErrorMapping
    );
  }

  private errorHandler(dataReceived: string) {
    if (
      dataReceived.indexOf(`Function "heap_trace_start" not defined`) !== -1 ||
      dataReceived.indexOf(`Function "heap_trace_stop" not defined`) !== -1
    ) {
      void handleError(
        "espIdf.heaptrace",
        heapTraceNotSupported(),
        undefined,
        heapTraceCommandErrorMapping
      );
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
    let content = `set pagination off\nset confirm off\ntarget remote :3333\n\nmon reset halt\nflushregs\n\n`;
    content += `tb heap_trace_start\ncommands\nmon esp sysview_mcore start "${traceFilePath}"\n`;
    content += `c\nend\n\ntb heap_trace_stop\ncommands\nmon esp sysview_mcore stop\nend\n\nc`;
    const filePath = join(workspaceFolder, this.gdbinitFileName);
    await writeFile(filePath, content);
  }
}
