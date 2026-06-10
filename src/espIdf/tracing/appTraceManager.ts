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
import { mkdirSync } from "fs";
import { join, sep } from "path";
import { readParameter, writeParameter } from "../../configuration/idf";
import { Logger } from "../../common/logger";
import { fileExists } from "../../utils";
import { OpenOCDManager } from "../openOcd/openOcdManager";
import { TCLClient } from "../openOcd/tcl/tclClient";
import { AppTraceArchiveTreeDataProvider } from "./tree/appTraceArchiveTreeDataProvider";
import {
  AppTraceButtonType,
  AppTraceTreeDataProvider,
} from "./tree/appTraceTreeDataProvider";
import { ConfigurationTarget, Uri, window } from "vscode";

export interface IAppTraceManagerConfig {
  host: string;
  port: number;
  timeout?: number;
  shellPrompt?: string;
}

export class AppTraceManager extends EventEmitter {
  public static async saveConfiguration(workspace: Uri) {
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
    workspace: Uri
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

  public async start(workspace: Uri) {
    try {
      if (await OpenOCDManager.init().promptUserToLaunchOpenOCDServer()) {
        this.treeDataProvider.showStopButton(AppTraceButtonType.AppTraceButton);
        this.treeDataProvider.updateDescription(
          AppTraceButtonType.AppTraceButton,
          ""
        );

        // Send reset command first to ensure proper initialization, then start app trace
        const resetHandler = this.sendCommandToTCLSession("reset", workspace);
        resetHandler.on("response", () => {
          // Reset completed, now start app trace
          this.executeAppTraceStart(workspace);
          resetHandler.stop();
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unknown error occurred while starting app trace.";
      Logger.errorNotify(errorMessage, error as Error, "AppTraceManager start");
    }
  }

  private executeAppTraceStart(workspace: Uri) {
    const fileName = `file:${sep}${sep}${join(
      workspace.fsPath,
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
    const tracingStatusHandler = this.appTracingStatusChecker(workspace, () => {
      tracingStatusHandler.stop();
      startTrackingHandler.stop();

      this.treeDataProvider.showStartButton(AppTraceButtonType.AppTraceButton);
      this.treeDataProvider.updateDescription(
        AppTraceButtonType.AppTraceButton,
        "[Stopped]"
      );
      this.archiveDataProvider.populateArchiveTree();

      // Stop OpenOCD server when app tracing finishes naturally
      const openOCDManager = OpenOCDManager.init();
      if (openOCDManager.isRunning()) {
        openOCDManager.stop();
      }
    });
  }

  public async stop(workspace: Uri) {
    if (await OpenOCDManager.init().promptUserToLaunchOpenOCDServer()) {
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

        // Stop OpenOCD server after app tracing is stopped
        const openOCDManager = OpenOCDManager.init();
        if (openOCDManager.isRunning()) {
          openOCDManager.stop();
        }
      });
    } else {
      this.treeDataProvider.updateDescription(
        AppTraceButtonType.AppTraceButton,
        "[Terminated]"
      );
    }
    this.treeDataProvider.showStartButton(AppTraceButtonType.AppTraceButton);
    this.archiveDataProvider.refresh();
  }

  private sendCommandToTCLSession(command: string, workspace: Uri): TCLClient {
    if (!fileExists(join(workspace.fsPath, "trace"))) {
      mkdirSync(join(workspace.fsPath, "trace"));
    }
    const host = readParameter("openocd.tcl.host", workspace) as string;
    const port = readParameter("openocd.tcl.port", workspace) as number;
    const tclConnectionParams = { host, port };
    const startTracingCommandHandler = new TCLClient(tclConnectionParams);
    startTracingCommandHandler.sendCommandWithCapture(command);
    return startTracingCommandHandler;
  }
  private appTracingStatusChecker(workspace: Uri, onStop: () => void): TCLClient {
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
          } catch (error) {
            this.treeDataProvider.updateDescription(
              AppTraceButtonType.AppTraceButton,
              `Tracing...`
            );
          }
        }
      }
    });

    tclClient.on("error", (error: Error) => {
      Logger.error(
        `Some error prevailed while checking the tracking status`,
        error,
        "AppTraceManager appTracingStatusChecker"
      );
      this.shallContinueCheckingStatus = false;
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
