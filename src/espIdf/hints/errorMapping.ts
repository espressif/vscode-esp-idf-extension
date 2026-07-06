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

const hintsOutputChannel = "OpenOCD";

export const openOcdHintsCommandErrorMapping: CommandErrorMapping = {
  [ErrorCode.FILE_NOT_FOUND]: {
    severity: ErrorSeverity.Warning,
    userMessage:
      "OpenOCD hints file not found at {filePath}. Hints may require a specific OpenOCD version.",
    logMessage: "OpenOCD hints file not found: {filePath}.",
    actions: [
      {
        label: "View Error Hints",
        execute: () => commands.executeCommand("espIdf.errorHints.focus"),
      },
    ],
    outputChannel: hintsOutputChannel,
  },
  [ErrorCode.PARSE_ERROR]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "Failed to parse OpenOCD hints file at {filePath}. Please check the syntax.",
    logMessage: "Parse error in OpenOCD hints file: {filePath}.",
    actions: [
      {
        label: "View Error Hints",
        execute: () => commands.executeCommand("espIdf.errorHints.focus"),
      },
    ],
    outputChannel: hintsOutputChannel,
  },
  [ErrorCode.OpenOcdHintsLoadFailed]: {
    severity: ErrorSeverity.Warning,
    userMessage: "Failed to load OpenOCD error hints: {detail}",
    logMessage: "OpenOCD hints load failed: {detail}",
    actions: [
      {
        label: "View Error Hints",
        execute: () => commands.executeCommand("espIdf.errorHints.focus"),
      },
    ],
    outputChannel: hintsOutputChannel,
  },
};
