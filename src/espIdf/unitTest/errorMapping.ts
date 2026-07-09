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

export const unitTestOutputChannel = "Unit Test";

export const unitTestCommandErrorMapping: CommandErrorMapping = {
  [ErrorCode.UnitTestTaskFailed]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "Unit test app task failed. Check the terminal output for details.",
    logMessage: "Unit test app task failed: {detail}.",
    actions: [
      {
        label: "View Terminal Output",
        execute: () => commands.executeCommand("workbench.action.terminal.focus"),
      },
    ],
    outputChannel: unitTestOutputChannel,
  },
  [ErrorCode.TaskFailedWithOutput]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "Unit test app build failed. Check the terminal output for details.",
    logMessage: "Unit test app build task failed with captured output.",
    actions: [
      {
        label: "View Terminal Output",
        execute: () => commands.executeCommand("workbench.action.terminal.focus"),
      },
    ],
    outputChannel: unitTestOutputChannel,
  },
  [ErrorCode.AlreadyBuilding]: {
    severity: ErrorSeverity.Warning,
    userMessage: "Wait for ESP-IDF build to finish before building the unit test app.",
    logMessage:
      "Attempted to build unit test app while another build is in progress.",
    actions: [],
    outputChannel: unitTestOutputChannel,
  },
  [ErrorCode.AlreadyFlashing]: {
    severity: ErrorSeverity.Warning,
    userMessage: "Wait for ESP-IDF flash to finish before flashing the unit test app.",
    logMessage:
      "Attempted to flash unit test app while another flash is in progress.",
    actions: [],
    outputChannel: unitTestOutputChannel,
  },
  [ErrorCode.IdfTaskInProgress]: {
    severity: ErrorSeverity.Warning,
    userMessage: "Wait for ESP-IDF {taskName} to finish before running unit tests.",
    logMessage: "Unit test blocked while {taskName} is in progress.",
    actions: [],
    outputChannel: unitTestOutputChannel,
  },
  [ErrorCode.BuildTerminated]: {
    severity: ErrorSeverity.Warning,
    userMessage: "Unit test app build was terminated.",
    logMessage: "Unit test app build was terminated by user cancellation.",
    actions: [],
    outputChannel: unitTestOutputChannel,
  },
  [ErrorCode.FlashTerminated]: {
    severity: ErrorSeverity.Warning,
    userMessage: "Unit test app flash was stopped.",
    logMessage: "Unit test app flash was terminated by user cancellation.",
    actions: [],
    outputChannel: unitTestOutputChannel,
  },
  [ErrorCode.NoPortSelected]: {
    severity: ErrorSeverity.Error,
    userMessage: "Select a serial port before flashing the unit test app.",
    logMessage: "No serial port selected for unit test app flash.",
    actions: [
      {
        label: "Select Port",
        execute: () => commands.executeCommand("espIdf.selectPort"),
      },
    ],
    outputChannel: unitTestOutputChannel,
  },
  [ErrorCode.NoSerialPort]: {
    severity: ErrorSeverity.Warning,
    userMessage: "No serial port found for current IDF_TARGET: {idfTarget}",
    logMessage: "No serial port found for IDF_TARGET {idfTarget}.",
    actions: [
      {
        label: "Select Port",
        execute: () => commands.executeCommand("espIdf.selectPort"),
      },
    ],
    outputChannel: unitTestOutputChannel,
  },
  [ErrorCode.MISSING_DEPENDENCY]: {
    severity: ErrorSeverity.Error,
    userMessage: "Required dependency {dependency} is missing.",
    logMessage: "Missing dependency: {dependency}.",
    actions: [],
    outputChannel: unitTestOutputChannel,
  },
  [ErrorCode.NO_WORKSPACE_OPEN]: {
    severity: ErrorSeverity.Warning,
    userMessage: "Please open a workspace folder first.",
    logMessage: "Unit test command requires an open workspace.",
    actions: [
      {
        label: "Open Folder…",
        execute: () => commands.executeCommand("vscode.openFolder"),
      },
    ],
    outputChannel: unitTestOutputChannel,
  },
};
