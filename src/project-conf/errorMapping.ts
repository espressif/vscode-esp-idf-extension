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

const projectConfOutputChannel = "Project Configuration";

export const projectConfCommandErrorMapping: CommandErrorMapping = {
  [ErrorCode.FILE_NOT_FOUND]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "Could not load ESP-IDF targets. File not found: {filePath}.",
    logMessage: "ESP-IDF targets file not found: {filePath}.",
    actions: [],
    outputChannel: projectConfOutputChannel,
  },
  [ErrorCode.MISSING_DEPENDENCY]: {
    severity: ErrorSeverity.Error,
    userMessage: "Project Configuration Manager is not initialized.",
    logMessage: "Project Configuration Manager not initialized.",
    actions: [
      {
        label: "Reload Window",
        execute: () => commands.executeCommand("workbench.action.reloadWindow"),
      },
    ],
    outputChannel: projectConfOutputChannel,
  },
  [ErrorCode.PARSE_ERROR]: {
    severity: ErrorSeverity.Error,
    userMessage: "Failed to parse project configuration file at {filePath}.",
    logMessage: "Project configuration parse error: {filePath}.",
    actions: [
      {
        label: "Open Project Configuration Editor",
        execute: () =>
          commands.executeCommand("espIdf.projectConfigurationEditor"),
      },
    ],
    outputChannel: projectConfOutputChannel,
  },
};
