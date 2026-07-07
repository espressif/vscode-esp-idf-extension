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
import { OutputChannel } from "../../common/outputChannel";
import { CommandErrorMapping, ErrorCode } from "../../common/error/types";

export const sizeOutputChannel = "Size";

export const sizeCommandErrorMapping: CommandErrorMapping = {
  [ErrorCode.FILE_NOT_FOUND]: {
    severity: ErrorSeverity.Info,
    userMessage: "ESP-IDF Size requires a build first. Build your project?",
    logMessage: "Size analysis blocked: required file not found: {filePath}.",
    actions: [
      {
        label: "Build",
        execute: () => commands.executeCommand("espIdf.buildDevice"),
      },
    ],
    outputChannel: sizeOutputChannel,
  },
  [ErrorCode.TaskFailedWithOutput]: {
    severity: ErrorSeverity.Error,
    userMessage: "Size analysis failed. Check the output for details.",
    logMessage: "Size analysis task failed with captured output.",
    actions: [
      {
        label: "View Output",
        execute: () => OutputChannel.show(),
      },
    ],
    outputChannel: sizeOutputChannel,
  },
  [ErrorCode.MISSING_DEPENDENCY]: {
    severity: ErrorSeverity.Error,
    userMessage: "Required dependency {dependency} is missing.",
    logMessage: "Missing dependency: {dependency}.",
    actions: [],
    outputChannel: sizeOutputChannel,
  },
  [ErrorCode.PARSE_ERROR]: {
    severity: ErrorSeverity.Error,
    userMessage: "Failed to parse size analysis output from {filePath}.",
    logMessage: "Failed to parse idf_size.py output for {filePath}.",
    actions: [],
    outputChannel: sizeOutputChannel,
  },
  [ErrorCode.INVALID_CONFIGURATION]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "Extension setting {setting} is invalid. Please review your configuration.",
    logMessage: "Invalid extension configuration: {setting}.",
    actions: [
      {
        label: "Open Settings",
        execute: () =>
          commands.executeCommand(
            "workbench.action.openSettings",
            "idf.buildPath"
          ),
      },
    ],
    outputChannel: sizeOutputChannel,
  },
  [ErrorCode.InvalidIdfVersion]: {
    severity: ErrorSeverity.Error,
    userMessage: "Failed to read ESP-IDF version from {idfPath}.",
    logMessage: "Failed to read ESP-IDF version from {idfPath}: {detail}.",
    actions: [],
    outputChannel: sizeOutputChannel,
  },
};
