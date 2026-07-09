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

export const buildOutputChannel = "Build";

export const buildCommandErrorMapping: CommandErrorMapping = {
  [ErrorCode.TaskFailedWithOutput]: {
    severity: ErrorSeverity.Error,
    userMessage: "Build task failed. Check the terminal output for details.",
    logMessage: "Build task failed with captured output.",
    actions: [
      {
        label: "View Terminal Output",
        execute: () => commands.executeCommand("workbench.action.terminal.focus"),
      },
    ],
    outputChannel: buildOutputChannel,
  },
  [ErrorCode.AlreadyBuilding]: {
    severity: ErrorSeverity.Warning,
    userMessage: "Wait for ESP-IDF build to finish",
    logMessage: "Attempted to start a build while another build is in progress.",
    actions: [],
    outputChannel: buildOutputChannel,
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
    outputChannel: buildOutputChannel,
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
    outputChannel: buildOutputChannel,
  },
  [ErrorCode.BuildTerminated]: {
    severity: ErrorSeverity.Warning,
    userMessage: "Build was terminated.",
    logMessage: "Build was terminated by user cancellation.",
    actions: [],
    outputChannel: buildOutputChannel,
  },
  [ErrorCode.IdfTaskInProgress]: {
    severity: ErrorSeverity.Warning,
    userMessage: "Wait for ESP-IDF {taskName} to finish before building.",
    logMessage: "Attempted to build while {taskName} is in progress.",
    actions: [],
    outputChannel: buildOutputChannel,
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
    outputChannel: buildOutputChannel,
  },
  [ErrorCode.FlasherArgsMissing]: {
    severity: ErrorSeverity.Warning,
    userMessage:
      "flasher_args.json file is missing from the build directory, can't proceed, please build properly!",
    logMessage: "flasher_args.json missing from build directory.",
    actions: [
      {
        label: "Build",
        execute: () => commands.executeCommand("espIdf.buildDevice"),
      },
    ],
    outputChannel: buildOutputChannel,
  },
  [ErrorCode.DfuTargetNotCompatible]: {
    severity: ErrorSeverity.Warning,
    userMessage:
      'The selected device target "{target}" is not compatible for DFU, as a result the dfu.bin was not created.',
    logMessage: 'IDF target "{target}" is not compatible with DFU build.',
    actions: [
      {
        label: "Set Target",
        execute: () => commands.executeCommand("espIdf.setTarget"),
      },
    ],
    outputChannel: buildOutputChannel,
  },
  [ErrorCode.MISSING_DEPENDENCY]: {
    severity: ErrorSeverity.Error,
    userMessage: "Required dependency {dependency} is missing.",
    logMessage: "Missing dependency: {dependency}.",
    actions: [],
    outputChannel: buildOutputChannel,
  },
  [ErrorCode.ToolchainNotFound]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "Toolchain {toolchain} was not found. Please install it and ensure it is in your PATH.",
    logMessage: "Toolchain {toolchain} executable not found.",
    actions: [
      {
        label: "Open ESP-IDF Install Manager",
        execute: () => commands.executeCommand("espIdf.installManager"),
      },
    ],
    outputChannel: buildOutputChannel,
  },
};
