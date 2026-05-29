/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 22nd April 2026 3:11:38 pm
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
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

import { l10n, WorkspaceFolder } from "vscode";
import { WSServer } from "../../communications/ws";
import { IDFMonitor } from "../terminal";
import { interruptMonitorWithDelay } from "../interruptMonitorWithDelay";
import { handleWsCoreDumpDetected } from "./coreDumpHandler";
import { handleWsGdbStubDetected } from "./gdbStubHandler";
import { Logger } from "../../../logger/logger";
import { logInvalidConfigReason } from "../configValidation";
import { loadMonitorLaunchConfig } from "../launchConfig";

export let IdfMonitorWebSocketServer: WSServer;

export async function startWithWebSocket(
  wsFolder: WorkspaceFolder,
  noReset: boolean,
  wsPort: number
) {
  const monitorConfigResult = await loadMonitorLaunchConfig(
    wsFolder,
    noReset,
    wsPort
  );
  logInvalidConfigReason(monitorConfigResult);
  if (monitorConfigResult.ok === false) {
    return;
  }
  if (typeof monitorConfigResult.config.wsPort === "undefined") {
    return;
  }
  if (IdfMonitorWebSocketServer) {
    IdfMonitorWebSocketServer.close();
  }
  IdfMonitorWebSocketServer = new WSServer(wsPort);
  IdfMonitorWebSocketServer.on("started", async () => {
    IDFMonitor.updateConfiguration(monitorConfigResult.config);
    await interruptMonitorWithDelay(
      monitorConfigResult.config.workspaceFolder.uri
    );
    await IDFMonitor.start();
  })
    .on("core-dump-detected", (resp) =>
      handleWsCoreDumpDetected(
        {
          wsFolder: monitorConfigResult.config.workspaceFolder,
          idfPath: monitorConfigResult.idfPath,
          pythonBinPath: monitorConfigResult.config.pythonBinPath,
          gdbPath: `${monitorConfigResult.config.toolchainPrefix}gdb`,
        },
        resp
      )
    )
    .on("gdb-stub-detected", (resp) =>
      handleWsGdbStubDetected(
        {
          wsFolder: monitorConfigResult.config.workspaceFolder,
          gdbPath: `${monitorConfigResult.config.toolchainPrefix}gdb`,
        },
        resp
      )
    )
    .on("close", () => {
      IdfMonitorWebSocketServer.close();
    })
    .on("error", (err) => {
      let message = err?.message ?? String(err);
      if (err?.message?.includes("EADDRINUSE")) {
        message = l10n.t(
          `Your port {wsPort} is not available, use (idf.wssPort) to change to different port`,
          { wsPort: monitorConfigResult.config.wsPort }
        );
      }
      Logger.errorNotify(
        message,
        err instanceof Error ? err : new Error(String(err)),
        "extension launchWSServerAndMonitor error event"
      );
      IdfMonitorWebSocketServer.close();
    });
  IdfMonitorWebSocketServer.start();
}
