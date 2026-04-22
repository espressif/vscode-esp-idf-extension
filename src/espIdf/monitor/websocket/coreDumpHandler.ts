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
import { NotificationMode, readParameter } from "../../../idfConfiguration";
import { ESPCoreDumpPyTool, InfoCoreFileFormat } from "../../core-dump";
import { getProjectName } from "../../../workspaceConfig";
import { IdfMonitorWebSocketServer } from ".";
import { IDFMonitor } from "../terminal";
import { Logger } from "../../../logger/logger";

const CORE_DUMP_SESSION_ID = "core-dump.debug.session.ws";

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
        const buildDirPath = readParameter("idf.buildPath", wsFolder) as string;
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
          })) === true
        ) {
          progress.report({
            message: l10n.t(
              "Successfully created ELF file from the info received (espcoredump.py)"
            ),
          });
          const workspaceFolder = workspace.getWorkspaceFolder(wsFolder.uri);
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
          registerWsMonitorDebugCleanup(CORE_DUMP_SESSION_ID, () => {
            IdfMonitorWebSocketServer.done();
            IDFMonitor.dispose();
            IdfMonitorWebSocketServer.close();
          });
        } else {
          Logger.warnNotify(
            l10n.t(
              "Failed to generate the ELF file from the info received, please close the core-dump monitor terminal manually"
            )
          );
        }
      } catch (error) {
        Logger.errorNotify(
          l10n.t("Failed to launch debugger for postmortem"),
          error as Error,
          "extension launchWSServerAndMonitor coredump"
        );
      }
    }
  );
}
