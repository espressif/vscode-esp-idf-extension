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
import { ErrorSeverity } from "../common/customNotifications";
import { CommandErrorMapping, ErrorCode } from "../common/error/types";

export const efuseOutputChannel = "eFuse";

const selectPortAction = {
  label: "Select Port",
  execute: () => commands.executeCommand("espIdf.selectPort"),
};

export const efuseCommandErrorMapping: CommandErrorMapping = {
  [ErrorCode.IdfVersionTooLow]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "ESP-IDF v{minVersion} or higher is required for the eFuse view (current: {currentVersion}).",
    logMessage:
      "eFuse summary blocked: ESP-IDF {currentVersion} is below required {minVersion}.",
    actions: [
      {
        label: "Open ESP-IDF Install Manager",
        execute: () => commands.executeCommand("espIdf.installManager"),
      },
    ],
    outputChannel: efuseOutputChannel,
  },
  [ErrorCode.INVALID_CONFIGURATION]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "IDF_PATH is not set. Configure ESP-IDF before reading eFuse data.",
    logMessage: "eFuse summary blocked: {setting} is not configured.",
    actions: [
      {
        label: "Open ESP-IDF Install Manager",
        execute: () => commands.executeCommand("espIdf.installManager"),
      },
    ],
    outputChannel: efuseOutputChannel,
  },
  [ErrorCode.MISSING_DEPENDENCY]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "Required dependency {dependency} is missing. Configure ESP-IDF before reading eFuse data.",
    logMessage: "eFuse summary blocked: missing dependency {dependency}.",
    actions: [
      {
        label: "Open ESP-IDF Install Manager",
        execute: () => commands.executeCommand("espIdf.installManager"),
      },
    ],
    outputChannel: efuseOutputChannel,
  },
  [ErrorCode.NoSerialPort]: {
    severity: ErrorSeverity.Warning,
    userMessage:
      "No serial port found for current IDF_TARGET: {idfTarget}. Select a valid port and try again.",
    logMessage: "eFuse summary blocked: no serial port for target {idfTarget}.",
    actions: [selectPortAction],
    outputChannel: efuseOutputChannel,
  },
  [ErrorCode.EfuseSummaryFailed]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "Failed to get the eFuse summary from the chip. Make sure you have selected a valid port. {detail}",
    logMessage: "eFuse summary command failed: {detail}.",
    actions: [selectPortAction],
    outputChannel: efuseOutputChannel,
  },
};
