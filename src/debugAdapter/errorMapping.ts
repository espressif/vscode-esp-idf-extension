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

const debugOutputChannel = "Debug";

export const debugCommandErrorMapping: CommandErrorMapping = {
  [ErrorCode.NO_WORKSPACE_OPEN]: {
    severity: ErrorSeverity.Warning,
    userMessage: "Open a workspace folder before starting a debug session.",
    logMessage: "Debug session requires an open workspace folder.",
    actions: [
      {
        label: "Open Folder…",
        execute: () => commands.executeCommand("vscode.openFolder"),
      },
    ],
    outputChannel: debugOutputChannel,
  },
  [ErrorCode.FILE_NOT_FOUND]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "Required file {filePath} could not be found for the debug session.",
    logMessage: "Debug file not found: {filePath}.",
    actions: [
      {
        label: "Build Project",
        execute: () => commands.executeCommand("espIdf.buildDevice"),
      },
    ],
    outputChannel: debugOutputChannel,
  },
  [ErrorCode.INVALID_CONFIGURATION]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "Debug configuration setting {setting} is invalid. When verifyAppBinBeforeDebug fails, flash the device before debugging.",
    logMessage: "Invalid debug configuration: {setting}.",
    actions: [
      {
        label: "Open launch.json",
        execute: () => commands.executeCommand("workbench.action.debug.configure"),
      },
    ],
    outputChannel: debugOutputChannel,
  },
  [ErrorCode.MISSING_DEPENDENCY]: {
    severity: ErrorSeverity.Error,
    userMessage: "Required dependency {dependency} is missing for debugging.",
    logMessage: "Debug missing dependency: {dependency}.",
    actions: [],
    outputChannel: debugOutputChannel,
  },
  [ErrorCode.IdfToolNotFound]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "Toolchain tool {toolName} was not found. Check your ESP-IDF setup.",
    logMessage: "Debug toolchain tool not found: {toolName}.",
    actions: [
      {
        label: "Select ESP-IDF Version",
        execute: () => commands.executeCommand("espIdf.selectCurrentIdfVersion"),
      },
    ],
    outputChannel: debugOutputChannel,
  },
  [ErrorCode.NoSerialPort]: {
    severity: ErrorSeverity.Warning,
    userMessage:
      "No serial port found for IDF target {idfTarget}. App binary verification was skipped.",
    logMessage: "No serial port for debug app verify (target: {idfTarget}).",
    actions: [
      {
        label: "Select Port",
        execute: () => commands.executeCommand("espIdf.selectPort"),
      },
    ],
    outputChannel: debugOutputChannel,
  },
  [ErrorCode.FlasherArgsMissing]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "flasher_args.json is missing. Build the project before debugging.",
    logMessage: "flasher_args.json missing for debug app verification.",
    actions: [
      {
        label: "Build Project",
        execute: () => commands.executeCommand("espIdf.buildDevice"),
      },
    ],
    outputChannel: debugOutputChannel,
  },
  [ErrorCode.BuildRequiredBeforeFlash]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "Project ELF not found in {buildDirPath}. Build the project first.",
    logMessage: "Debug ELF missing in build directory: {buildDirPath}.",
    actions: [
      {
        label: "Build Project",
        execute: () => commands.executeCommand("espIdf.buildDevice"),
      },
    ],
    outputChannel: debugOutputChannel,
  },
  [ErrorCode.EsptoolNotAccessible]: {
    severity: ErrorSeverity.Error,
    userMessage: "esptool is not accessible. Check your ESP-IDF installation.",
    logMessage: "esptool not accessible during debug app verification.",
    actions: [],
    outputChannel: debugOutputChannel,
  },
  [ErrorCode.TaskFailedWithOutput]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "App binary verification failed. Check the terminal output for details.",
    logMessage: "Debug app verify task failed with captured output.",
    actions: [
      {
        label: "View Terminal Output",
        execute: () => commands.executeCommand("workbench.action.terminal.focus"),
      },
    ],
    outputChannel: debugOutputChannel,
  },
  [ErrorCode.PARSE_ERROR]: {
    severity: ErrorSeverity.Error,
    userMessage: "Failed to parse file {filePath} for the debug session.",
    logMessage: "Debug parse error: {filePath}.",
    actions: [],
    outputChannel: debugOutputChannel,
  },
  [ErrorCode.FILE_PERMISSION_DENIED]: {
    severity: ErrorSeverity.Warning,
    userMessage:
      "Cannot write to file {filePath}. Check file permissions.",
    logMessage: "Debug file permission denied: {filePath}.",
    actions: [],
    outputChannel: debugOutputChannel,
  },
  [ErrorCode.OpenOcdNotRunning]: {
    severity: ErrorSeverity.Warning,
    userMessage:
      "OpenOCD is not running. Please start OpenOCD before launching the debug session.",
    logMessage: "OpenOCD server is not running before debug session launch.",
    actions: [
      {
        label: "Launch OpenOCD",
        execute: () => commands.executeCommand("espIdf.openOCDCommand"),
      },
    ],
    outputChannel: debugOutputChannel,
  },
};

export const debugDapErrorMapping: CommandErrorMapping = {
  ...debugCommandErrorMapping,
  [ErrorCode.INVALID_CONFIGURATION]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "Debug launch setting {setting} is invalid or missing.",
    logMessage: "Invalid DAP launch configuration: {setting}.",
    actions: [],
    outputChannel: debugOutputChannel,
  },
  [ErrorCode.TraceGdbProcessFailed]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "GDB operation failed: {detail}. Check the debug console for details.",
    logMessage: "GDB process failed during debug session: {detail}.",
    actions: [],
    outputChannel: debugOutputChannel,
  },
};
