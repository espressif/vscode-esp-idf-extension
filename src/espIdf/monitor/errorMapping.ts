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

export const monitorOutputChannel = "Monitor";

const selectPortAction = {
  label: "Select Port",
  execute: () => commands.executeCommand("espIdf.selectPort"),
};

const buildProjectAction = {
  label: "Build",
  execute: () => commands.executeCommand("espIdf.buildDevice"),
};

export const monitorCommandErrorMapping: CommandErrorMapping = {
  [ErrorCode.IdfTaskInProgress]: {
    severity: ErrorSeverity.Warning,
    userMessage:
      "Wait for ESP-IDF {taskName} to finish before starting the monitor.",
    logMessage: "Attempted to start monitor while {taskName} is in progress.",
    actions: [],
    outputChannel: monitorOutputChannel,
  },
  [ErrorCode.NoPortSelected]: {
    severity: ErrorSeverity.Error,
    userMessage: "Select a serial port before starting the monitor.",
    logMessage: "No serial port selected for monitor.",
    actions: [selectPortAction],
    outputChannel: monitorOutputChannel,
  },
  [ErrorCode.MISSING_DEPENDENCY]: {
    severity: ErrorSeverity.Error,
    userMessage: "Required dependency {dependency} is missing.",
    logMessage: "Missing dependency: {dependency}.",
    actions: [],
    outputChannel: monitorOutputChannel,
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
            "idf.customExtraVars"
          ),
      },
    ],
    outputChannel: monitorOutputChannel,
  },
  [ErrorCode.InvalidIdfVersion]: {
    severity: ErrorSeverity.Error,
    userMessage: "Failed to read ESP-IDF version from {idfPath}.",
    logMessage: "Failed to read ESP-IDF version from {idfPath}: {detail}.",
    actions: [],
    outputChannel: monitorOutputChannel,
  },
  [ErrorCode.IdfToolNotFound]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "{toolName} was not found. Please install {toolName} and ensure it's in your PATH.",
    logMessage: "{toolName} executable not found.",
    actions: [
      {
        label: "Open ESP-IDF Install Manager",
        execute: () => commands.executeCommand("espIdf.installManager"),
      },
    ],
    outputChannel: monitorOutputChannel,
  },
  [ErrorCode.IdfTargetNotSet]: {
    severity: ErrorSeverity.Error,
    userMessage: "IDF target is not set.",
    logMessage: "IDF_TARGET is not set in the environment variables.",
    actions: [
      {
        label: "Set Target",
        execute: () => commands.executeCommand("espIdf.setTarget"),
      },
    ],
    outputChannel: monitorOutputChannel,
  },
  [ErrorCode.FILE_NOT_FOUND]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "Project ELF file not found at {filePath}. Build your project first.",
    logMessage: "Monitor blocked: project ELF file not found: {filePath}.",
    actions: [buildProjectAction],
    outputChannel: monitorOutputChannel,
  },
  [ErrorCode.MonitorWsPortNotConfigured]: {
    severity: ErrorSeverity.Error,
    userMessage: "WebSocket port (idf.wssPort) is not configured.",
    logMessage: "WebSocket monitor port (idf.wssPort) is not configured.",
    actions: [
      {
        label: "Open Settings",
        execute: () =>
          commands.executeCommand(
            "workbench.action.openSettings",
            "idf.wssPort"
          ),
      },
    ],
    outputChannel: monitorOutputChannel,
  },
  [ErrorCode.MonitorWsPortInUse]: {
    severity: ErrorSeverity.Warning,
    userMessage:
      "Port {wsPort} is not available. Change idf.wssPort to use a different port.",
    logMessage: "WebSocket monitor port {wsPort} is already in use.",
    actions: [
      {
        label: "Open Settings",
        execute: () =>
          commands.executeCommand(
            "workbench.action.openSettings",
            "idf.wssPort"
          ),
      },
    ],
    outputChannel: monitorOutputChannel,
  },
  [ErrorCode.WebsocketClientInstallFailed]: {
    severity: ErrorSeverity.Error,
    userMessage: "Failed to install websocket client dependencies.",
    logMessage: "Failed to install websocket_client: {detail}.",
    actions: [],
    outputChannel: monitorOutputChannel,
  },
  [ErrorCode.MonitorCoreDumpElfGenerationFailed]: {
    severity: ErrorSeverity.Warning,
    userMessage:
      "Failed to generate ELF from core dump. Close the core-dump monitor terminal manually.",
    logMessage: "Core dump ELF generation failed.",
    actions: [],
    outputChannel: monitorOutputChannel,
  },
  [ErrorCode.MonitorDebugLaunchFailed]: {
    severity: ErrorSeverity.Error,
    userMessage: "Failed to launch debugger for postmortem ({context}).",
    logMessage: "Monitor postmortem debug launch failed ({context}): {detail}.",
    actions: [],
    outputChannel: monitorOutputChannel,
  },
};
