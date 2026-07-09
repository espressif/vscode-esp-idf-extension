/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 10th April 2026 2:55:48 pm
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

import { commands, ExtensionContext } from "vscode";
import { registerIDFCommand } from "../common/registerCommand";
import { openFolderCheck, PreCheck, webIdeCheck } from "../common/PreCheck";
import { ESP } from "../config";
import { flash } from "./flashProject";
import { selectFlashMethod } from "./selectFlashMethod";
import { ErrorCode, CommandErrorMapping } from "../common/error/types";
import { ErrorSeverity } from "../common/customNotifications";

const flashCommandErrorMapping: CommandErrorMapping = {
  [ErrorCode.TaskFailedWithOutput]: {
    severity: ErrorSeverity.Error,
    userMessage: "Flash task failed. Check the terminal output for details.",
    logMessage: "Flash task failed with captured output.",
    actions: [
      {
        label: "View Terminal Output",
        execute: () => commands.executeCommand("workbench.action.terminal.focus"),
      },
    ],
    outputChannel: "Flash",
  },
  [ErrorCode.OpenOcdNotRunning]: {
    severity: ErrorSeverity.Warning,
    userMessage:
      "Can't perform JTAG flash, because OpenOCD server is not running!",
    logMessage: "OpenOCD server is not running after launch attempt.",
    actions: [
      {
        label: "Launch OpenOCD",
        execute: () => commands.executeCommand("espIdf.openOCDCommand"),
      },
    ],
    outputChannel: "Flash",
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
    outputChannel: "Flash",
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
    outputChannel: "Flash",
  },
  [ErrorCode.OpenOcdLaunchDeclined]: {
    severity: ErrorSeverity.Info,
    userMessage: "OpenOCD was not launched.",
    logMessage: "JTAG flash cancelled: user declined to launch OpenOCD.",
    actions: [
      {
        label: "Launch OpenOCD",
        execute: () => commands.executeCommand("espIdf.openOCDCommand"),
      },
    ],
    outputChannel: "Flash",
  },
  [ErrorCode.FlashTypeNotSelected]: {
    severity: ErrorSeverity.Error,
    userMessage: "Select a flash method before flashing.",
    logMessage: "Flash blocked: idf.flashType is not configured.",
    actions: [
      {
        label: "Select Flash Method",
        execute: () => commands.executeCommand("espIdf.selectFlashMethod"),
      },
    ],
    outputChannel: "Flash",
  },
  [ErrorCode.FlashEncryptionValidationFailed]: {
    severity: ErrorSeverity.Info,
    userMessage:
      "Flash encryption validation did not pass. See the Flash Encryption output for details.",
    logMessage:
      "Flash encryption validation failed ({resultType}). Details were shown in the Flash Encryption output.",
    actions: [],
    outputChannel: "Flash Encryption",
  },
};

function registerFlashCommand(
  context: ExtensionContext,
  name: string,
  callback: (...args: any[]) => any
) {
  registerIDFCommand(context, name, callback, flashCommandErrorMapping);
}

export function registerFlashCommands(context: ExtensionContext) {
  registerFlashCommand(context, "espIdf.jtag_flash", () =>
    flash(false, ESP.FlashType.JTAG)
  );
  registerFlashCommand(context, "espIdf.flashDFU", () =>
    flash(false, ESP.FlashType.DFU)
  );
  registerFlashCommand(context, "espIdf.flashUart", () =>
    flash(undefined, ESP.FlashType.UART)
  );
  registerFlashCommand(context, "espIdf.flashDevice", () => flash(undefined));
  registerFlashCommand(context, "espIdf.flashAndEncryptDevice", () =>
    flash(true)
  );

  registerFlashCommand(context, "espIdf.flashAppUart", () =>
    flash(undefined, ESP.FlashType.UART, ESP.BuildType.App)
  );

  registerFlashCommand(context, "espIdf.flashBootloaderUart", () =>
    flash(undefined, ESP.FlashType.UART, ESP.BuildType.Bootloader)
  );

  registerFlashCommand(context, "espIdf.flashPartitionTableUart", () =>
    flash(undefined, ESP.FlashType.UART, ESP.BuildType.PartitionTable)
  );

  registerFlashCommand(context, "espIdf.selectFlashMethod", () =>
    PreCheck.perform([openFolderCheck, webIdeCheck], async () => {
      const ws = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
      await selectFlashMethod(ws);
    })
  );
}
