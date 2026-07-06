/*
 * Project: ESP-IDF VSCode Extension
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

import { commands } from "vscode";
import { ErrorSeverity } from "../../common/customNotifications";
import { CommandErrorMapping, ErrorCode } from "../../common/error/types";
import { OutputChannel } from "../../common/outputChannel";

const openOcdOutputChannel = "OpenOCD";

export const openOcdCommandErrorMapping: CommandErrorMapping = {
  [ErrorCode.IdfToolNotFound]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "Invalid OpenOCD bin path or access is denied. Check idf.customOpenOCDPath or ensure openocd is in PATH.",
    logMessage: "{toolName} executable not found or not accessible.",
    actions: [
      {
        label: "Open Settings",
        execute: () =>
          commands.executeCommand(
            "workbench.action.openSettings",
            "idf.customOpenOCDPath"
          ),
      },
    ],
    outputChannel: openOcdOutputChannel,
  },
  [ErrorCode.MISSING_DEPENDENCY]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "OPENOCD_SCRIPTS environment variable is missing. Set it in idf.customExtraVars or in your system environment.",
    logMessage: "Missing dependency: {dependency}.",
    actions: [
      {
        label: "Open Settings",
        execute: () =>
          commands.executeCommand(
            "workbench.action.openSettings",
            "idf.customExtraVars"
          ),
      },
    ],
    outputChannel: openOcdOutputChannel,
  },
  [ErrorCode.INVALID_CONFIGURATION]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "Invalid OpenOCD config files. Check idf.openOcdConfigs or select a board configuration.",
    logMessage: "Invalid extension configuration: {setting}.",
    actions: [
      {
        label: "Select Board Configs",
        execute: () =>
          commands.executeCommand("espIdf.selectOpenOcdConfigFiles"),
      },
    ],
    outputChannel: openOcdOutputChannel,
  },
  [ErrorCode.OpenOcdStartFailed]: {
    severity: ErrorSeverity.Error,
    userMessage: "OpenOCD server failed to start: {detail}",
    logMessage: "OpenOCD server failed to start: {detail}",
    actions: [
      {
        label: "View OpenOCD Output",
        execute: () => OutputChannel.show(),
      },
    ],
    outputChannel: openOcdOutputChannel,
  },
  [ErrorCode.OpenOcdProcessExited]: {
    severity: ErrorSeverity.Error,
    userMessage: "OpenOCD exited with error code {exitCode}.",
    logMessage: "OpenOCD process exited with non-zero code {exitCode}.",
    actions: [
      {
        label: "View OpenOCD Output",
        execute: () => OutputChannel.show(),
      },
    ],
    outputChannel: openOcdOutputChannel,
  },
};
