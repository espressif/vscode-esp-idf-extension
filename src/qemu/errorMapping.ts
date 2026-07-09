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

export const qemuOutputChannel = "QEMU";

export const qemuCommandErrorMapping: CommandErrorMapping = {
  [ErrorCode.QemuTargetNotSupported]: {
    severity: ErrorSeverity.Error,
    userMessage:
      'IDF target "{target}" is not supported by Espressif QEMU. Check your ESP-IDF and QEMU installation.',
    logMessage: 'QEMU does not support IDF target "{target}".',
    actions: [
      {
        label: "Open ESP-IDF Install Manager",
        execute: () => commands.executeCommand("espIdf.installManager"),
      },
    ],
    outputChannel: qemuOutputChannel,
  },
  [ErrorCode.QemuLaunchArgsMissing]: {
    severity: ErrorSeverity.Error,
    userMessage: "No QEMU launch arguments found.",
    logMessage: "QEMU launch arguments could not be resolved.",
    actions: [],
    outputChannel: qemuOutputChannel,
  },
  [ErrorCode.QemuDebugLaunchFailed]: {
    severity: ErrorSeverity.Error,
    userMessage: "Failed to launch GDB debugger for QEMU: {detail}",
    logMessage: "QEMU debug session launch failed: {detail}.",
    actions: [],
    outputChannel: qemuOutputChannel,
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
    outputChannel: qemuOutputChannel,
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
    outputChannel: qemuOutputChannel,
  },
  [ErrorCode.NO_WORKSPACE_OPEN]: {
    severity: ErrorSeverity.Warning,
    userMessage: "Please open a workspace folder first.",
    logMessage: "QEMU command requires an open workspace.",
    actions: [
      {
        label: "Open Folder…",
        execute: () => commands.executeCommand("vscode.openFolder"),
      },
    ],
    outputChannel: qemuOutputChannel,
  },
};
