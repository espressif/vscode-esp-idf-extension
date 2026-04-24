/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import { join } from "path";
import { debug, workspace, WorkspaceFolder } from "vscode";
import { registerWsMonitorDebugCleanup } from "./monitorDebugCleanup";
import { GDBStubResponse } from "../../communications/ws";
import { IdfMonitorWebSocketServer } from ".";
import { IDFMonitor } from "../terminal";
import { Logger } from "../../../logger/logger";

const GDB_STUB_SESSION_ID = "gdbstub.debug.session.ws";

export interface WsGdbStubHandlerContext {
  wsFolder: WorkspaceFolder;
  gdbPath: string;
}

export async function handleWsGdbStubDetected(
  ctx: WsGdbStubHandlerContext,
  resp: GDBStubResponse
): Promise<void> {
  const { wsFolder, gdbPath } = ctx;
  try {
    const workspaceFolder = workspace.getWorkspaceFolder(wsFolder.uri);
    await debug.startDebugging(workspaceFolder, {
      name: "GDB Stub Debug",
      type: "gdbtarget",
      request: "attach",
      sessionID: GDB_STUB_SESSION_ID,
      gdb: gdbPath,
      program: resp.prog,
      logFile: `${join(wsFolder.uri.fsPath, "gdbstub.log")}`,
      target: {
        connectCommands: [`target remote ${resp.port}`],
      },
    });
    registerWsMonitorDebugCleanup(GDB_STUB_SESSION_ID, () => {
      IdfMonitorWebSocketServer.done();
      IDFMonitor.dispose();
      IdfMonitorWebSocketServer.close();
    });
  } catch (error) {
    Logger.errorNotify(
      "Failed to launch debugger for postmortem",
      error as Error,
      "extension launchWSServerAndMonitor gdbstub"
    );
  }
}
