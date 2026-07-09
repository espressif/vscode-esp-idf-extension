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

export const newProjectOutputChannel = "New Project";

export const newProjectCommandErrorMapping: CommandErrorMapping = {
  [ErrorCode.NO_WORKSPACE_OPEN]: {
    severity: ErrorSeverity.Warning,
    userMessage: "Please open a workspace folder first.",
    logMessage: "New Project command requires an open workspace.",
    actions: [
      {
        label: "Open Folder…",
        execute: () => commands.executeCommand("vscode.openFolder"),
      },
    ],
    outputChannel: newProjectOutputChannel,
  },
  [ErrorCode.NewProjectWizardFailed]: {
    severity: ErrorSeverity.Error,
    userMessage: "Failed to start the ESP-IDF New Project wizard.",
    logMessage: "New Project wizard failed: {detail}.",
    actions: [],
    outputChannel: newProjectOutputChannel,
  },
  [ErrorCode.ProjectScaffoldFailed]: {
    severity: ErrorSeverity.Error,
    userMessage: "Failed to {operation}.",
    logMessage: "Project scaffold failed during {operation}: {detail}.",
    actions: [],
    outputChannel: newProjectOutputChannel,
  },
  [ErrorCode.ImportProjectFailed]: {
    severity: ErrorSeverity.Error,
    userMessage: "Failed to import the ESP-IDF project.",
    logMessage: "Import project failed: {detail}.",
    actions: [],
    outputChannel: newProjectOutputChannel,
  },
  [ErrorCode.FILE_NOT_FOUND]: {
    severity: ErrorSeverity.Error,
    userMessage: "The file {filePath} could not be found.",
    logMessage: "New Project file not found: {filePath}.",
    actions: [],
    outputChannel: newProjectOutputChannel,
  },
  [ErrorCode.FILE_PERMISSION_DENIED]: {
    severity: ErrorSeverity.Error,
    userMessage: "Permission denied when accessing {filePath}.",
    logMessage: "New Project file permission denied: {filePath}.",
    actions: [],
    outputChannel: newProjectOutputChannel,
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
    outputChannel: newProjectOutputChannel,
  },
  [ErrorCode.MISSING_DEPENDENCY]: {
    severity: ErrorSeverity.Error,
    userMessage: "Required dependency {dependency} is missing.",
    logMessage: "Missing dependency: {dependency}.",
    actions: [
      {
        label: "Open ESP-IDF Install Manager",
        execute: () => commands.executeCommand("espIdf.installManager"),
      },
    ],
    outputChannel: newProjectOutputChannel,
  },
  [ErrorCode.InvalidIdfVersion]: {
    severity: ErrorSeverity.Error,
    userMessage: "Failed to read ESP-IDF version from {idfPath}.",
    logMessage: "Failed to read ESP-IDF version from {idfPath}: {detail}.",
    actions: [],
    outputChannel: newProjectOutputChannel,
  },
};
