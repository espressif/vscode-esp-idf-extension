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

import { commands, WorkspaceFolder } from "vscode";
import { ErrorSeverity } from "../../../common/customNotifications";
import { WSServer } from "../../communications/ws";
import { IDFMonitor } from "../terminal";
import { interruptMonitorWithDelay } from "../interruptMonitorWithDelay";
import { handleWsCoreDumpDetected } from "./coreDumpHandler";
import { handleWsGdbStubDetected } from "./gdbStubHandler";
import { loadMonitorLaunchConfig } from "../launchConfig";
import { handleError } from "../../../common/error/handler";
import {
  monitorWsPortInUse,
  monitorWsPortNotConfigured,
} from "../../../common/error/knownError";

export let IdfMonitorWebSocketServer: WSServer;

const LAUNCH_WS_MONITOR_COMMAND = "espIdf.launchWSServerAndMonitor";

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
  if (typeof monitorConfigResult.config.wsPort === "undefined") {
    throw monitorWsPortNotConfigured({
      severity: ErrorSeverity.Error,
      userMessage: "WebSocket port (idf.wssPort) is not configured.",
      logMessage: "WebSocket monitor port (idf.wssPort) is not configured.",
      actions: [
        {
          label: "Open Settings",
          execute: () =>
            commands.executeCommand(
              "workbench.action.openSettings",
              "idf.wssPort"
            ),
        },
      ],
      outputChannel: "Monitor",
    });
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
    .on("error", async (err) => {
      if (err?.message?.includes("EADDRINUSE")) {
        await handleError(
          LAUNCH_WS_MONITOR_COMMAND,
          monitorWsPortInUse(monitorConfigResult.config.wsPort as number)
        );
      } else {
        await handleError(LAUNCH_WS_MONITOR_COMMAND, err);
      }
      IdfMonitorWebSocketServer.close();
    });
  IdfMonitorWebSocketServer.start();
}
