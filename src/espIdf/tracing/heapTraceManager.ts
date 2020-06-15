/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 8th August 2019 6:41:01 pm
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
import * as vscode from "vscode";

import { mkdirSync } from "fs";
import { join } from "path";
import * as idfConf from "../../idfConfiguration";
import { Logger } from "../../logger/logger";
import { fileExists, getElfFilePath, PreCheck } from "../../utils";
import { OpenOCDManager } from "../openOcd/openOcdManager";
import { TCLClient } from "../openOcd/tcl/tclClient";
import { Nm } from "./tools/xtensa/nm";
import { AppTraceArchiveTreeDataProvider } from "./tree/appTraceArchiveTreeDataProvider";
import {
  AppTraceButtonType,
  AppTraceTreeDataProvider,
} from "./tree/appTraceTreeDataProvider";

export class HeapTraceManager extends EventEmitter {
  private treeDataProvider: AppTraceTreeDataProvider;
  private archiveDataProvider: AppTraceArchiveTreeDataProvider;
  private heapTraceNotificationTCLClientHandler: TCLClient;
  private heapTraceCommandChainTCLClientHandler: TCLClient;
  private heapTraceChannel: vscode.OutputChannel;

  constructor(
    treeDataProvider: AppTraceTreeDataProvider,
    archiveDataProvider: AppTraceArchiveTreeDataProvider
  ) {
    super();
    this.treeDataProvider = treeDataProvider;
    this.archiveDataProvider = archiveDataProvider;
    const tclConnectionParams = { host: "localhost", port: 6666 };
    this.heapTraceNotificationTCLClientHandler = new TCLClient(
      tclConnectionParams
    );
    this.heapTraceCommandChainTCLClientHandler = new TCLClient(
      tclConnectionParams
    );
    this.heapTraceChannel = vscode.window.createOutputChannel("Heap Trace");
  }

  public async start() {
    try {
      if (await OpenOCDManager.init().promptUserToLaunchOpenOCDServer()) {
        const commandChain = CommandChain.init();
        commandChain.clear();
        this.heapTraceChannel.clear();
        this.showStopButton();
        const workspace = PreCheck.isWorkspaceFolderOpen()
          ? vscode.workspace.workspaceFolders[0].uri.fsPath
          : "";
        if (!fileExists(join(workspace, "trace"))) {
          mkdirSync(join(workspace, "trace"));
        }
        const addresses = await this.getAddressFor([
          "heap_trace_start",
          "heap_trace_stop",
        ]);
        const fileName = `file://${join(
          workspace,
          "trace"
        )}/htrace_${new Date().getTime()}.svdat`;
        let showStopButtonTimer: any;

        commandChain
          .buildCommand({
            command: "reset halt",
            responseHandler: {
              type: "notificationResponse",
              handler: [
                "type target_reset mode halt",
                "type target_state state halted",
              ],
            },
          })
          .buildCommand({
            command: `bp 0x${addresses.heap_trace_start} 4 hw`,
            responseHandler: { type: "commandResponse", handler: [] },
          })
          .buildCommand({
            command: `bp 0x${addresses.heap_trace_stop} 4 hw`,
            responseHandler: { type: "commandResponse", handler: [] },
          })
          .buildCommand({
            command: "resume",
            responseHandler: {
              type: "notificationResponse",
              handler: [
                "type target_event event resumed",
                "type target_state state running",
                "type target_state state halted",
              ],
            },
          })
          .buildCommand({
            command: "reg pc",
            responseHandler: {
              type: "commandResponse",
              handler: [addresses.heap_trace_start],
            },
          })
          .buildCommand({
            command: `rbp 0x${addresses.heap_trace_start}`,
            responseHandler: {
              type: "commandResponse",
              handler: [TCLClient.DELIMITER],
            },
          })
          .buildCommand({
            command: `esp sysview_mcore start ${fileName}`,
            responseHandler: { type: "commandResponse", handler: [] },
          })
          .buildCommand({
            command: "resume",
            responseHandler: {
              type: "notificationResponse",
              handler: [
                "type target_event event resumed",
                "type target_state state running",
                "type target_state state halted",
              ],
            },
          })
          .buildCommand({
            command: "reg pc",
            responseHandler: {
              type: "commandResponse",
              handler: [addresses.heap_trace_stop],
            },
          })
          .buildCommand({
            command: `rbp 0x${addresses.heap_trace_stop}`,
            responseHandler: {
              type: "commandResponse",
              handler: [TCLClient.DELIMITER],
            },
          })
          .buildCommand({
            command: `esp sysview stop`,
            responseHandler: { type: "commandResponse", handler: [] },
          })
          .on("response", async (resp: Buffer, from: string) => {
            if (!commandChain.currentTask) {
              if (showStopButtonTimer) {
                clearTimeout(showStopButtonTimer);
              }
              showStopButtonTimer = this.showStopButtonWithDelay(3000);
              return;
            }
            if (commandChain.currentTask.command) {
              if (commandChain.currentTask.responseHandler.type === from) {
                const handler =
                  commandChain.currentTask.responseHandler.handler;
                if (handler && handler.length > 0) {
                  const deleteIndices = new Set<number>();
                  handler.forEach((trail: string, index: number) => {
                    if (
                      resp.toString().toLowerCase().match(trail.toLowerCase())
                    ) {
                      deleteIndices.add(index);
                    }
                  });
                  commandChain.currentTask.responseHandler.handler = commandChain.currentTask.responseHandler.handler.filter(
                    (value: string, index: number) => !deleteIndices.has(index)
                  );
                }
                if (
                  commandChain.currentTask.responseHandler.handler.length !== 0
                ) {
                  // still some tokens pending to be matched
                  return;
                }
                commandChain.next();
              } else {
                // cannot handle
                return Logger.warn(
                  `[Heap_Trace]:: responseHandler & from mismatch ${JSON.stringify(
                    { resp: resp.toString() }
                  )}`
                );
              }
            }
            if (commandChain.currentTask && commandChain.currentTask.command) {
              this.heapTraceCommandChainTCLClientHandler.sendCommandWithCapture(
                commandChain.currentTask.command
              );
            }
          });
        this.heapTraceNotificationTCLClientHandler.on(
          "response",
          async (resp: Buffer) => {
            this.heapTraceChannel.appendLine("<<<TCL_Notification>>>\n" + resp);
            if (
              resp.toString().match(/Target Notification output  is enabled/)
            ) {
              return;
            }
            commandChain.emitResponse(resp, "notificationResponse");
          }
        );
        this.heapTraceCommandChainTCLClientHandler.on(
          "response",
          (resp: Buffer) => {
            this.heapTraceChannel.appendLine("<<<Command_Chanel>>>\n" + resp);
            commandChain.emitResponse(resp, "commandResponse");
          }
        );
        this.heapTraceNotificationTCLClientHandler.sendCommandWithCapture(
          "tcl_notifications on"
        );
        const firstCommandChainTask = commandChain.next();
        if (firstCommandChainTask.command) {
          this.heapTraceCommandChainTCLClientHandler.sendCommandWithCapture(
            firstCommandChainTask.command
          );
        }
      }
    } catch (error) {
      Logger.errorNotify(error.message, error);
    }
  }

  public async stop() {
    try {
      if (await OpenOCDManager.init().promptUserToLaunchOpenOCDServer()) {
        this.showStartButton();
        this.heapTraceNotificationTCLClientHandler.stop();
        this.heapTraceCommandChainTCLClientHandler.stop();
      }
    } catch (error) {
      Logger.errorNotify(error.message, error);
    }
  }

  private showStopButtonWithDelay(timer: number): any {
    return setTimeout(() => {
      this.heapTraceNotificationTCLClientHandler.stop();
      this.heapTraceCommandChainTCLClientHandler.stop();
      this.archiveDataProvider.populateArchiveTree();
      this.showStartButton();
    }, timer);
  }

  private showStopButton() {
    this.treeDataProvider.showStopButton(AppTraceButtonType.HeapTraceButton);
  }
  private showStartButton() {
    this.treeDataProvider.showStartButton(AppTraceButtonType.HeapTraceButton);
  }

  private async getAddressFor(symbols: string[]): Promise<any> {
    const emptyURI: vscode.Uri = undefined;
    const workspaceRoot = PreCheck.isWorkspaceFolderOpen()
      ? vscode.workspace.workspaceFolders[0].uri
      : emptyURI;
    const elfFile = await getElfFilePath(workspaceRoot);
    const nm = new Nm(workspaceRoot, elfFile);
    const resp = await nm.run();
    const respStr = resp.toString();
    const respArr = respStr.split("\n");
    const lookUpTable = {};
    respArr.forEach((line) => {
      const lineArr = line.trim().split(/\s+/);
      lookUpTable[lineArr[2]] = lineArr[0];
    });
    const respObj = {};
    symbols.forEach((symbol) => {
      respObj[symbol] = lookUpTable[symbol];
    });
    return respObj;
  }
}

type CommandChainOnResponseHandler = (response: Buffer, from: string) => void;

type CommandChainResponseTypes = "notificationResponse" | "commandResponse";
interface ICommandChainTaskResponseHandler {
  type: CommandChainResponseTypes;
  handler: string[];
}

// tslint:disable-next-line: interface-name
interface CommandChainTask {
  command: string;
  responseHandler: ICommandChainTaskResponseHandler;
}

// tslint:disable-next-line: max-classes-per-file
class CommandChain {
  public static init(): CommandChain {
    if (!this.instance) {
      this.instance = new CommandChain();
    }
    return this.instance;
  }

  private static instance: CommandChain;
  public currentTask: CommandChainTask;

  private chain: CommandChainTask[];
  private responseHandler: CommandChainOnResponseHandler;

  private constructor() {
    this.chain = new Array<CommandChainTask>();
    this.currentTask = undefined;
  }

  public on(type: "response", handler: CommandChainOnResponseHandler): this {
    this.responseHandler = handler;
    return this;
  }

  public buildCommand(commandChainTask: CommandChainTask): this {
    this.chain.push(commandChainTask);
    return this;
  }

  public emitResponse(data: Buffer, from: CommandChainResponseTypes) {
    if (this.responseHandler) {
      this.responseHandler(data, from);
    }
  }

  public next(): CommandChainTask {
    this.currentTask = this.chain.shift();
    return this.currentTask;
  }

  public clear() {
    this.currentTask = undefined;
    this.chain = new Array<CommandChainTask>();
  }
}
