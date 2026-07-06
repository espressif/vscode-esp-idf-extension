/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import { commands, ExtensionContext, l10n } from "vscode";
import { registerIDFCommand } from "../common/registerCommand";
import { withProgressWrapper } from "../common/withProgressWrapper";
import { openFolderCheck, webIdeCheck } from "../common/PreCheck";
import { readParameter } from "../configuration/idf";
import { ESP } from "../config";
import { eraseFlashMain } from "./main";
import { ErrorCode, CommandErrorMapping } from "../common/error/types";
import { ErrorSeverity } from "../common/customNotifications";

const eraseFlashCommandErrorMapping: CommandErrorMapping = {
  [ErrorCode.TaskFailedWithOutput]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "Erase flash task failed. Check the terminal output for details.",
    logMessage: "Erase flash task failed with captured output.",
    actions: [
      {
        label: "View Terminal Output",
        execute: () => commands.executeCommand("workbench.action.terminal.focus"),
      },
    ],
    outputChannel: "Erase flash",
  },
  [ErrorCode.OpenOcdNotRunning]: {
    severity: ErrorSeverity.Warning,
    userMessage:
      "Can't perform JTAG erase, because OpenOCD server is not running!",
    logMessage: "OpenOCD server is not running after launch attempt.",
    actions: [
      {
        label: "Launch OpenOCD",
        execute: () => commands.executeCommand("espIdf.openOCDCommand"),
      },
    ],
    outputChannel: "Erase flash",
  },
  [ErrorCode.OpenOcdNotReady]: {
    severity: ErrorSeverity.Warning,
    userMessage: "OpenOCD is not ready to accept commands. Please try again.",
    logMessage: "OpenOCD TCL server did not become ready within retry limit.",
    actions: [
      {
        label: "Launch OpenOCD",
        execute: () => commands.executeCommand("espIdf.openOCDCommand"),
      },
    ],
    outputChannel: "Erase flash",
  },
  [ErrorCode.OpenOcdVersionTooLow]: {
    severity: ErrorSeverity.Warning,
    userMessage:
      "Minimum OpenOCD version {minVersion} is required while you have {currentVersion} version installed",
    logMessage:
      "OpenOCD version {currentVersion} is below required minimum {minVersion}.",
    actions: [
      {
        label: "Launch OpenOCD",
        execute: () => commands.executeCommand("espIdf.openOCDCommand"),
      },
    ],
    outputChannel: "Erase flash",
  },
  [ErrorCode.OpenOcdLaunchDeclined]: {
    severity: ErrorSeverity.Info,
    userMessage: "OpenOCD was not launched.",
    logMessage: "JTAG erase cancelled: user declined to launch OpenOCD.",
    actions: [
      {
        label: "Launch OpenOCD",
        execute: () => commands.executeCommand("espIdf.openOCDCommand"),
      },
    ],
    outputChannel: "Erase flash",
  },
};

export function registerEraseFlashCommand(context: ExtensionContext) {
  registerIDFCommand(
    context,
    "espIdf.eraseFlash",
    async () => {
      await withProgressWrapper(
        [webIdeCheck, openFolderCheck],
        l10n.t("ESP-IDF: Erasing device flash memory (erase_flash)"),
        async (_progress, cancelToken) => {
          const workspaceFolder =
            ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
          const flashType = readParameter(
            "idf.flashType",
            workspaceFolder
          ) as ESP.FlashType;

          await eraseFlashMain(workspaceFolder, cancelToken, flashType);
        }
      );
    },
    eraseFlashCommandErrorMapping
  );
}
