/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 26th June 2026 6:01:46 pm
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

import { commands, window } from "vscode";
import {
  ErrorCode,
  KnownErrorDescriptor,
} from "./types";
import { ErrorSeverity } from "../customNotifications";

/**
 * Global registry of default descriptors for each known error code.
 * Commands can override these per-command via CommandErrorMapping.
 */
const errorRegistry = new Map<ErrorCode, KnownErrorDescriptor>();

export function registerNewErrorInRegistry(descriptor: KnownErrorDescriptor): void {
  errorRegistry.set(descriptor.code, descriptor);
}

// ──────────────────────────── Task errors ────────────────────────────

registerNewErrorInRegistry({
  code: ErrorCode.TaskFailed,
  severity: ErrorSeverity.Error,
  userMessage: "A task failed during execution. Please check the output for details.",
  logMessage: "Task execution failed. See terminal output for more information.",
  actions: [
    {
      label: "View Terminal Output",
      execute: () => commands.executeCommand("workbench.action.terminal.focus"),
    },
  ],
});

// ──────────────────────────── Build errors ────────────────────────────

registerNewErrorInRegistry({
  code: ErrorCode.AlreadyBuilding,
  severity: ErrorSeverity.Warning,
  userMessage: "Wait for ESP-IDF build to finish",
  logMessage: "Attempted to start a build while another build is in progress.",
  actions: [],
});

registerNewErrorInRegistry({
  code: ErrorCode.IdfToolNotFound,
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
});

registerNewErrorInRegistry({
  code: ErrorCode.IdfTargetNotSet,
  severity: ErrorSeverity.Error,
  userMessage:
    'IDF target is not set. Use "ESP-IDF: Set Espressif Device Target".',
  logMessage: "IDF_TARGET is not set in the environment variables.",
  actions: [
    {
      label: "Set Target",
      execute: () => commands.executeCommand("espIdf.setTarget"),
    },
  ],
});

registerNewErrorInRegistry({
  code: ErrorCode.BuildTerminated,
  severity: ErrorSeverity.Warning,
  userMessage: "Build was terminated.",
  logMessage: "Build was terminated by user cancellation.",
  actions: [],
});

registerNewErrorInRegistry({
  code: ErrorCode.FlashInProgress,
  severity: ErrorSeverity.Warning,
  userMessage: "Wait for ESP-IDF flash to finish before building.",
  logMessage: "Attempted to build while a flash operation is in progress.",
  actions: [],
});

registerNewErrorInRegistry({
  code: ErrorCode.TaskFailedWithOutput,
  severity: ErrorSeverity.Error,
  userMessage:
    "Build task failed. Check the terminal output for details.",
  logMessage: "Build task failed with captured output.",
  actions: [
    {
      label: "View Terminal Output",
      execute: () => commands.executeCommand("workbench.action.terminal.focus"),
    },
  ],
});


// ──────────────────────────── File errors ────────────────────────────

registerNewErrorInRegistry({
  code: ErrorCode.FILE_NOT_FOUND,
  severity: ErrorSeverity.Error,
  userMessage: "The requested file could not be found.",
  logMessage: "File not found during command execution.",
  actions: [
    {
      label: "Open File…",
      execute: () =>
        commands.executeCommand("workbench.action.quickOpen"),
    },
  ],
});

registerNewErrorInRegistry({
  code: ErrorCode.FILE_PERMISSION_DENIED,
  severity: ErrorSeverity.Error,
  userMessage: "Permission denied when accessing the file.",
  logMessage: "File permission denied.",
  actions: [
    {
      label: "Retry as Admin",
      execute: async () => {
        // Platform-specific logic or guidance
        window.showInformationMessage(
          "Please re-open VS Code with elevated privileges."
        );
      },
    },
  ],
});

registerNewErrorInRegistry({
  code: ErrorCode.FILE_TOO_LARGE,
  severity: ErrorSeverity.Warning,
  userMessage: "The file is too large to process.",
  logMessage: "File exceeded maximum size limit.",
  actions: [],
});

// ──────────────────────────── Workspace errors ───────────────────────

registerNewErrorInRegistry({
  code: ErrorCode.NO_WORKSPACE_OPEN,
  severity: ErrorSeverity.Warning,
  userMessage: "Please open a workspace folder first.",
  logMessage: "Command requires an open workspace.",
  actions: [
    {
      label: "Open Folder…",
      execute: () => commands.executeCommand("vscode.openFolder"),
    },
  ],
});

registerNewErrorInRegistry({
  code: ErrorCode.NO_ACTIVE_EDITOR,
  severity: ErrorSeverity.Info,
  userMessage: "No active text editor. Please open a file first.",
  logMessage: "Command requires an active text editor.",
  actions: [
    {
      label: "Open File…",
      execute: () =>
        commands.executeCommand("workbench.action.quickOpen"),
    },
  ],
});

// ──────────────────────────── Config errors ──────────────────────────

registerNewErrorInRegistry({
  code: ErrorCode.INVALID_CONFIGURATION,
  severity: ErrorSeverity.Error,
  userMessage: "Extension configuration is invalid. Please review settings.",
  logMessage: "Invalid extension configuration detected.",
  actions: [
    {
      label: "Open Settings",
      execute: () =>
        commands.executeCommand(
          "workbench.action.openSettings",
          "myExtension"
        ),
    },
  ],
});

registerNewErrorInRegistry({
  code: ErrorCode.MISSING_DEPENDENCY,
  severity: ErrorSeverity.Error,
  userMessage: "A required dependency is missing.",
  logMessage: "Missing dependency.",
  actions: [
    {
      label: "Show Details",
      execute: () =>
        window.showInformationMessage(
          "Please install the required dependencies. See extension documentation."
        ),
    },
  ],
});

registerNewErrorInRegistry({
  code: ErrorCode.PARSE_ERROR,
  severity: ErrorSeverity.Error,
  userMessage: "Failed to parse the file. Please check the syntax.",
  logMessage: "Parse error encountered.",
  actions: [],
});

// ──────────────────────────── Public API ─────────────────────────────

export function getErrorDescriptor(
  code: ErrorCode
): KnownErrorDescriptor | undefined {
  return errorRegistry.get(code);
}

export function getAllErrorDescriptors(): ReadonlyMap<
  ErrorCode,
  KnownErrorDescriptor
> {
  return errorRegistry;
}
