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
