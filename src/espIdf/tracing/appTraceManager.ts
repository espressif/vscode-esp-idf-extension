/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 8th July 2019 11:18:25 am
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

import { EventEmitter } from "events";
import { mkdirSync } from "fs";
import { join } from "path";
import * as vscode from "vscode";
import * as idfConf from "../../idfConfiguration";
import { Logger } from "../../logger/logger";
import { fileExists, PreCheck } from "../../utils";
import { OpenOCDManager } from "../openOcd/openOcdManager";
import { TCLClient, TCLConnection } from "../openOcd/tcl/tclClient";
import { AppTraceArchiveTreeDataProvider } from "./tree/appTraceArchiveTreeDataProvider";
import {
  AppTraceButtonType,
  AppTraceTreeDataProvider,
} from "./tree/appTraceTreeDataProvider";

export interface IAppTraceManagerConfig {
  host: string;
  port: number;
  timeout?: number;
  shellPrompt?: string;
}

export class AppTraceManager extends EventEmitter {
  public static async saveConfiguration() {
    await this.promptUserForEditingApptraceConfig(
      "Data polling period for apptrace",
      "milliseconds",
      "trace.poll_period",
      (value: string): string => {
        if (value.match(/^[0-9]*$/g)) {
          return "";
        }
        return "Invalid poll_period value, please enter only number";
      }
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
      }
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
      }
    );
    await this.promptUserForEditingApptraceConfig(
      "Should wait for halt?",
      "0 = Starts Immediately; else wait",
      "trace.wait4halt",
      (value: string): string => {
        if (value.match(/^[0-9]*$/g)) {
          return "";
        }
        return "Invalid wait4halt value, please enter only number";
      }
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
      }
    );
  }

  private static async promptUserForEditingApptraceConfig(
    prompt: string,
    placeholder: string,
    paramName: string,
    validatorFunction: (value: string) => string
  ) {
    const savedConf = idfConf.readParameter(paramName);
    const userInput = await vscode.window.showInputBox({
      placeHolder: placeholder,
      value: savedConf,
      prompt,
      ignoreFocusOut: true,
      validateInput: validatorFunction,
    });
    if (userInput) {
      const target = idfConf.readParameter("idf.saveScope");
      await idfConf.writeParameter(paramName, userInput, target);
    }
  }

  private treeDataProvider: AppTraceTreeDataProvider;
  private archiveDataProvider: AppTraceArchiveTreeDataProvider;
  private tclConnectionParams: TCLConnection;
  private shallContinueCheckingStatus: boolean;

  constructor(
    treeDataProvider: AppTraceTreeDataProvider,
    archiveDataProvider: AppTraceArchiveTreeDataProvider
  ) {
    super();
    this.treeDataProvider = treeDataProvider;
    this.archiveDataProvider = archiveDataProvider;
    const host = idfConf.readParameter("openocd.tcl.host");
    const port = idfConf.readParameter("openocd.tcl.port");
    this.tclConnectionParams = { host, port };
    this.shallContinueCheckingStatus = false;
  }

  public async start() {
    try {
      if (await OpenOCDManager.init().promptUserToLaunchOpenOCDServer()) {
        this.treeDataProvider.showStopButton(AppTraceButtonType.AppTraceButton);
        this.treeDataProvider.updateDescription(
          AppTraceButtonType.AppTraceButton,
          ""
        );
        // tslint:disable-next-line: max-line-length
        const workspace = PreCheck.isWorkspaceFolderOpen()
          ? vscode.workspace.workspaceFolders[0].uri
          : undefined;
        const workspacePath = workspace ? workspace.fsPath : "";
        const fileName = vscode.Uri.file(
          join(workspacePath, "trace", `trace_${new Date().getTime()}.trace`)
        );
        const pollPeriod = idfConf.readParameter("trace.poll_period");
        const traceSize = idfConf.readParameter("trace.trace_size");
        const stopTmo = idfConf.readParameter("trace.stop_tmo");
        const wait4halt = idfConf.readParameter("trace.wait4halt");
        const skipSize = idfConf.readParameter("trace.skip_size");
        const startTrackingHandler = this.sendCommandToTCLSession(
          [
            "esp",
            "apptrace",
            "start",
            fileName,
            pollPeriod,
            traceSize,
            stopTmo,
            wait4halt,
            skipSize,
          ].join(" ")
        );
        const tracingStatusHandler = this.appTracingStatusChecker(() => {
          tracingStatusHandler.stop();
          startTrackingHandler.stop();

          this.treeDataProvider.showStartButton(
            AppTraceButtonType.AppTraceButton
          );
          this.treeDataProvider.updateDescription(
            AppTraceButtonType.AppTraceButton,
            "[Stopped]"
          );
          this.archiveDataProvider.populateArchiveTree();
        });
      }
    } catch (error) {
      Logger.errorNotify(error.message, error);
    }
  }

  public async stop() {
    if (await OpenOCDManager.init().promptUserToLaunchOpenOCDServer()) {
      this.shallContinueCheckingStatus = false;
      const stopHandler = this.sendCommandToTCLSession("esp32 apptrace stop");
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

  private sendCommandToTCLSession(command: string): TCLClient {
    const workspace = PreCheck.isWorkspaceFolderOpen()
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : "";
    if (!fileExists(join(workspace, "trace"))) {
      mkdirSync(join(workspace, "trace"));
    }
    const startTracingCommandHandler = new TCLClient(this.tclConnectionParams);
    startTracingCommandHandler.sendCommandWithCapture(command);
    return startTracingCommandHandler;
  }
  private appTracingStatusChecker(onStop: () => void): TCLClient {
    const tclClient = new TCLClient(this.tclConnectionParams);
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
        error
      );
      this.shallContinueCheckingStatus = false;
      onStop();
    });
    const statusCheckerTimer = setInterval(() => {
      if (this.shallContinueCheckingStatus) {
        tclClient.sendCommandWithCapture("esp32 apptrace status");
      } else {
        clearInterval(statusCheckerTimer);
      }
    }, 500);

    return tclClient;
  }
}
