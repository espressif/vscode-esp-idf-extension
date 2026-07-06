/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 8th July 2019 11:18:25 am
 * Copyright 2019 Espressif Systems (Shanghai) CO LTD
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
import { existsSync, mkdirSync } from "fs";
import { join, sep } from "path";
import { readParameter, writeParameter } from "../../configuration/idf";
import { handleError } from "../../common/error/handler";
import {
  TraceTclPhase,
  traceTclFailed,
} from "../../common/error/knownError";
import { ensureOpenOcdServerRunning } from "../openOcd/openOcdLaunch";
import { OpenOCDManager } from "../openOcd/openOcdManager";
import { TCLClient } from "../openOcd/tcl/tclClient";
import { AppTraceArchiveTreeDataProvider } from "./tree/appTraceArchiveTreeDataProvider";
import {
  AppTraceButtonType,
  AppTraceTreeDataProvider,
} from "./tree/appTraceTreeDataProvider";
import { ConfigurationTarget, window, WorkspaceFolder } from "vscode";
import { appTraceCommandErrorMapping } from "./errorMapping";

export interface IAppTraceManagerConfig {
  host: string;
  port: number;
  timeout?: number;
  shellPrompt?: string;
}

export class AppTraceManager extends EventEmitter {
  public static async saveConfiguration(workspace: WorkspaceFolder) {
    await this.promptUserForEditingApptraceConfig(
      "Data polling period for apptrace",
      "milliseconds",
      "trace.poll_period",
      (value: string): string => {
        if (value.match(/^[0-9]*$/g)) {
          return "";
        }
        return "Invalid poll_period value, please enter only number";
      },
      workspace
    );
    await this.promptUserForEditingApptraceConfig(
      "Maximum size of data to be collected",
      "bytes",
      "trace.trace_size",
      (value: string): string => {
        if (value.match(/^(?:-1|[0-9]*)$/g)) {
          return "";
        }
        return "Invalid trace_size value, only -1 or positive integer allowed";
      },
      workspace
    );
    await this.promptUserForEditingApptraceConfig(
      "Idle timeout for apptrace",
      "seconds",
      "trace.stop_tmo",
      (value: string): string => {
        if (value.match(/^[0-9]*$/g)) {
          return "";
        }
        return "Invalid stop_tmo value, please enter only number";
      },
      workspace
    );
    await this.promptUserForEditingApptraceConfig(
      "Should wait for halt?",
      "0 = Starts Immediately; else wait",
      "trace.wait4halt",
      (value: string): string => {
        if (value.match(/^[0-1]$/g)) {
          return "";
        }
        return "Invalid wait4halt value, please enter only number";
      },
      workspace
    );
    await this.promptUserForEditingApptraceConfig(
      "Number of bytes to skip at the start",
      "bytes",
      "trace.skip_size",
      (value: string): string => {
        if (value.match(/^[0-9]*$/g)) {
          return "";
        }
        return "Invalid skip_size value, please enter only number";
      },
      workspace
    );
  }

  private static async promptUserForEditingApptraceConfig(
    prompt: string,
    placeholder: string,
    paramName: string,
    validatorFunction: (value: string) => string,
    workspace: WorkspaceFolder
  ) {
    const savedConf = readParameter(paramName, workspace) as string;
    const userInput = await window.showInputBox({
      placeHolder: placeholder,
      value: savedConf,
      prompt,
      ignoreFocusOut: true,
      validateInput: validatorFunction,
    });
    if (userInput) {
      const target = readParameter(
        "idf.saveScope",
        workspace
      ) as ConfigurationTarget;
      await writeParameter(paramName, userInput, target, workspace);
    }
  }

  private treeDataProvider: AppTraceTreeDataProvider;
  private archiveDataProvider: AppTraceArchiveTreeDataProvider;
  private shallContinueCheckingStatus: boolean;

  constructor(
    treeDataProvider: AppTraceTreeDataProvider,
    archiveDataProvider: AppTraceArchiveTreeDataProvider
  ) {
    super();
    this.treeDataProvider = treeDataProvider;
    this.archiveDataProvider = archiveDataProvider;
    this.shallContinueCheckingStatus = false;
  }

  public async start(workspace: WorkspaceFolder) {
    await ensureOpenOcdServerRunning(workspace.uri);
    this.treeDataProvider.showStopButton(AppTraceButtonType.AppTraceButton);
    this.treeDataProvider.updateDescription(
      AppTraceButtonType.AppTraceButton,
      ""
    );

    const resetHandler = this.sendCommandToTCLSession("reset", workspace);
    resetHandler.on("response", () => {
      this.executeAppTraceStart(workspace);
      resetHandler.stop();
    });
    resetHandler.on("error", (error: Error) => {
      this.handleAppTraceTclFailure(error.message, "reset");
      resetHandler.stop();
    });
  }

  private executeAppTraceStart(workspace: WorkspaceFolder) {
    const fileName = `file:${sep}${sep}${join(
      workspace.uri.fsPath,
      "trace",
      `trace_${new Date().getTime()}.trace`
    )}`.replace(/\\/g, "/");
    const pollPeriod = readParameter("trace.poll_period", workspace) as string;
    const traceSize = readParameter("trace.trace_size", workspace) as string;
    const stopTmo = readParameter("trace.stop_tmo", workspace) as string;
    const wait4halt = readParameter("trace.wait4halt", workspace) as string;
    const skipSize = readParameter("trace.skip_size", workspace) as string;
    const startTrackingHandler = this.sendCommandToTCLSession(
      [
        "esp",
        "apptrace",
        "start",
        `{${fileName}}`,
        pollPeriod,
        traceSize,
        stopTmo,
        wait4halt,
        skipSize,
      ].join(" "),
      workspace
    );
    startTrackingHandler.on("error", (error: Error) => {
      this.handleAppTraceTclFailure(error.message, "start");
      startTrackingHandler.stop();
    });
    const tracingStatusHandler = this.appTracingStatusChecker(workspace, () => {
      tracingStatusHandler.stop();
      startTrackingHandler.stop();

      this.treeDataProvider.showStartButton(AppTraceButtonType.AppTraceButton);
      this.treeDataProvider.updateDescription(
        AppTraceButtonType.AppTraceButton,
        "[Stopped]"
      );
      this.archiveDataProvider.populateArchiveTree();

      const openOCDManager = OpenOCDManager.init();
      if (openOCDManager.isRunning()) {
        openOCDManager.stop();
      }
    });
  }

  public async stop(workspace: WorkspaceFolder) {
    await ensureOpenOcdServerRunning(workspace.uri);
    this.shallContinueCheckingStatus = false;
    const stopHandler = this.sendCommandToTCLSession(
      "esp apptrace stop",
      workspace
    );
    stopHandler.on("response", (resp: Buffer) => {
      const respStr = resp.toString();
      if (respStr.includes("Tracing is not running!")) {
        this.treeDataProvider.updateDescription(
          AppTraceButtonType.AppTraceButton,
          "[NotRunning]"
        );
      } else if (respStr.includes("Disconnect targets")) {
        this.treeDataProvider.updateDescription(
          AppTraceButtonType.AppTraceButton,
          "[Disconnected]"
        );
      }
      stopHandler.stop();

      const openOCDManager = OpenOCDManager.init();
      if (openOCDManager.isRunning()) {
        openOCDManager.stop();
      }
    });
    stopHandler.on("error", (error: Error) => {
      this.handleAppTraceTclFailure(error.message, "stop");
      stopHandler.stop();
    });
    this.treeDataProvider.showStartButton(AppTraceButtonType.AppTraceButton);
    this.archiveDataProvider.refresh();
  }

  private handleAppTraceTclFailure(detail: string, phase: TraceTclPhase): void {
    this.shallContinueCheckingStatus = false;
    this.treeDataProvider.showStartButton(AppTraceButtonType.AppTraceButton);
    this.treeDataProvider.updateDescription(
      AppTraceButtonType.AppTraceButton,
      "[Terminated]"
    );
    void handleError(
      "espIdf.apptrace",
      traceTclFailed(detail, phase),
      undefined,
      appTraceCommandErrorMapping
    );
  }

  private sendCommandToTCLSession(command: string, workspace: WorkspaceFolder): TCLClient {
    if (!existsSync(join(workspace.uri.fsPath, "trace"))) {
      mkdirSync(join(workspace.uri.fsPath, "trace"));
    }
    const host = readParameter("openocd.tcl.host", workspace) as string;
    const port = readParameter("openocd.tcl.port", workspace) as number;
    const tclConnectionParams = { host, port };
    const startTracingCommandHandler = new TCLClient(tclConnectionParams);
    startTracingCommandHandler.sendCommandWithCapture(command);
    return startTracingCommandHandler;
  }

  private appTracingStatusChecker(workspace: WorkspaceFolder, onStop: () => void): TCLClient {
    const host = readParameter("openocd.tcl.host", workspace) as string;
    const port = readParameter("openocd.tcl.port", workspace) as number;
    const tclConnectionParams = { host, port };
    const tclClient = new TCLClient(tclConnectionParams);
    this.shallContinueCheckingStatus = true;
    tclClient.on("response", (resp: Buffer) => {
      const respStr = resp.toString();
      if (respStr.includes("Tracing is STOPPED")) {
        this.shallContinueCheckingStatus = false;
        onStop();
      } else {
        const matchArr = respStr.match(/[0-9]* of [0-9]*/gm);
        if (matchArr && matchArr.length > 0) {
          const progressArr = matchArr[0].split(" of ");
          try {
            const progressPercentage =
              (parseInt(progressArr[0], 10) / parseInt(progressArr[1], 10)) *
              100;
            this.treeDataProvider.updateDescription(
              AppTraceButtonType.AppTraceButton,
              `${Math.round(progressPercentage)}%`
            );
          } catch (_error) {
            this.treeDataProvider.updateDescription(
              AppTraceButtonType.AppTraceButton,
              `Tracing...`
            );
          }
        }
      }
    });

    tclClient.on("error", (error: Error) => {
      this.handleAppTraceTclFailure(error.message, "status");
      onStop();
    });
    const statusCheckerTimer = setInterval(() => {
      if (this.shallContinueCheckingStatus) {
        tclClient.sendCommandWithCapture("esp apptrace status");
      } else {
        clearInterval(statusCheckerTimer);
      }
    }, 500);

    return tclClient;
  }
}
