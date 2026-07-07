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

export const setTargetOutputChannel = "Set Target";

export const setTargetCommandErrorMapping: CommandErrorMapping = {
  [ErrorCode.TaskFailedWithOutput]: {
    severity: ErrorSeverity.Error,
    userMessage: "Set target failed. Check the output for details.",
    logMessage: "Set target task failed with captured output.",
    actions: [
      {
        label: "View Output",
        execute: () => OutputChannel.show(),
      },
    ],
    outputChannel: setTargetOutputChannel,
  },
  [ErrorCode.InvalidIdfTarget]: {
    severity: ErrorSeverity.Error,
    userMessage:
      '"{target}" is not a supported IDF target. Supported targets: {supportedTargets}.',
    logMessage:
      'Invalid IDF target "{target}". Supported targets: {supportedTargets}.',
    actions: [
      {
        label: "Set Target",
        execute: () => commands.executeCommand("espIdf.setTarget"),
      },
    ],
    outputChannel: setTargetOutputChannel,
  },
  [ErrorCode.IdfTaskInProgress]: {
    severity: ErrorSeverity.Warning,
    userMessage: "Wait for ESP-IDF set target to finish.",
    logMessage: "Attempted to start set target while set target is in progress.",
    actions: [],
    outputChannel: setTargetOutputChannel,
  },
  [ErrorCode.OpenOcdNoBoardsForTarget]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "No OpenOCD boards found for target {target}. Check your OPENOCD_SCRIPTS environment variable.",
    logMessage: "No OpenOCD boards found for target {target}.",
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
    outputChannel: setTargetOutputChannel,
  },
  [ErrorCode.FILE_NOT_FOUND]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "Could not load ESP-IDF targets. File not found: {filePath}.",
    logMessage: "ESP-IDF targets file not found: {filePath}.",
    actions: [],
    outputChannel: setTargetOutputChannel,
  },
  [ErrorCode.MISSING_DEPENDENCY]: {
    severity: ErrorSeverity.Error,
    userMessage: "Required dependency {dependency} is missing.",
    logMessage: "Missing dependency: {dependency}.",
    actions: [],
    outputChannel: setTargetOutputChannel,
  },
};
