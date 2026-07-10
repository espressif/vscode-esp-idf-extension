/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import { join } from "path";
import {
  debug,
  l10n,
  ProgressLocation,
  window,
  workspace,
  WorkspaceFolder,
} from "vscode";
import { registerWsMonitorDebugCleanup } from "./monitorDebugCleanup";
import { CoreDumpResponse } from "../../communications/ws";
import { NotificationMode, readParameter } from "../../../configuration/idf";
import { ESPCoreDumpPyTool, InfoCoreFileFormat } from "../../core-dump";
import { getIdfBuildPath, getProjectName } from "../../../configuration/workspace";
import { IdfMonitorWebSocketServer } from ".";
import { IDFMonitor } from "../terminal";
import { handleError } from "../../../common/error/handler";
import {
  isKnownError,
  monitorCoreDumpElfGenerationFailed,
  monitorDebugLaunchFailed,
} from "../../../common/error/knownError";

const CORE_DUMP_SESSION_ID = "core-dump.debug.session.ws";
const LAUNCH_WS_MONITOR_COMMAND = "espIdf.launchWSServerAndMonitor";

export interface WsCoreDumpHandlerContext {
  wsFolder: WorkspaceFolder;
  idfPath: string;
  pythonBinPath: string;
  gdbPath: string;
}

export function handleWsCoreDumpDetected(
  ctx: WsCoreDumpHandlerContext,
  resp: CoreDumpResponse
): void {
  const { wsFolder, idfPath, pythonBinPath, gdbPath } = ctx;
  const notificationMode = readParameter(
    "idf.notificationMode",
    wsFolder
  ) as string;
  const progressLocation =
    notificationMode === NotificationMode.All ||
    notificationMode === NotificationMode.Notifications
      ? ProgressLocation.Notification
      : ProgressLocation.Window;
  window.withProgress(
    {
      location: progressLocation,
      cancellable: false,
      title: l10n.t(
        "ESP-IDF: Core-dump detected, please wait while we parse the data received"
      ),
    },
    async (progress) => {
      try {
        const espCoreDumpPyTool = new ESPCoreDumpPyTool(idfPath);
        const buildDirPath = getIdfBuildPath(wsFolder);
        const projectName = await getProjectName(wsFolder.uri);
        const coreElfFilePath = join(
          buildDirPath,
          `${projectName}.coredump.elf`
        );
        if (
          (await espCoreDumpPyTool.generateCoreELFFile({
            coreElfFilePath,
            coreInfoFilePath: resp.file,
            infoCoreFileFormat: InfoCoreFileFormat.Base64,
            progELFFilePath: resp.prog,
            pythonBinPath,
            workspaceUri: wsFolder.uri,
          })) !== true
        ) {
          throw monitorCoreDumpElfGenerationFailed();
        }
        progress.report({
          message: l10n.t(
            "Successfully created ELF file from the info received (espcoredump.py)"
          ),
        });
        const workspaceFolder = workspace.getWorkspaceFolder(wsFolder.uri);
        registerWsMonitorDebugCleanup(CORE_DUMP_SESSION_ID, () => {
          IdfMonitorWebSocketServer.done();
          IDFMonitor.dispose();
          IdfMonitorWebSocketServer.close();
        });
        await debug.startDebugging(workspaceFolder, {
          name: "Core Dump Debug",
          sessionID: CORE_DUMP_SESSION_ID,
          type: "gdbtarget",
          request: "attach",
          gdb: gdbPath,
          program: resp.prog,
          logFile: `${join(wsFolder.uri.fsPath, "coredump.log")}`,
          target: {
            connectCommands: [`core ${coreElfFilePath}`],
          },
        });
      } catch (error) {
        if (isKnownError(error)) {
          await handleError(LAUNCH_WS_MONITOR_COMMAND, error);
          return;
        }
        const detail =
          error instanceof Error ? error.message : String(error);
        await handleError(
          LAUNCH_WS_MONITOR_COMMAND,
          monitorDebugLaunchFailed("core_dump", detail)
        );
      }
    }
  );
}
