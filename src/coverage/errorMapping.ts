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

import { commands, env, Uri } from "vscode";
import { ErrorSeverity } from "../common/customNotifications";
import { OutputChannel } from "../common/outputChannel";
import { CommandErrorMapping, ErrorCode } from "../common/error/types";

export const coverageOutputChannel = "Coverage";

const coverageDocsUrl =
  "https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/additionalfeatures/coverage.html";

export const coverageCommandErrorMapping: CommandErrorMapping = {
  [ErrorCode.CoverageGcovDataFailed]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "Error building gcov data from gcda files. Check the ESP-IDF output for more details.",
    logMessage: "Failed to build gcov data from gcda files: {detail}.",
    actions: [
      {
        label: "Coverage Tutorial",
        execute: () => env.openExternal(Uri.parse(coverageDocsUrl)),
      },
      {
        label: "View Output",
        execute: () => OutputChannel.show(),
      },
    ],
    outputChannel: coverageOutputChannel,
  },
  [ErrorCode.ConfserverProcessFailed]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "SDK Configuration editor process failed during {phase} while enabling coverage.",
    logMessage:
      "Confserver process failed during {phase} (exitCode: {exitCode}, detail: {detail}).",
    actions: [
      {
        label: "View Output",
        execute: () => OutputChannel.show(),
      },
    ],
    outputChannel: coverageOutputChannel,
  },
  [ErrorCode.ConfserverProtocolError]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "SDK Configuration editor returned an error while enabling coverage: {detail}.",
    logMessage: "Confserver protocol error: {detail}.",
    actions: [],
    outputChannel: coverageOutputChannel,
  },
  [ErrorCode.NO_WORKSPACE_OPEN]: {
    severity: ErrorSeverity.Warning,
    userMessage: "Please open a workspace folder first.",
    logMessage: "Coverage command requires an open workspace.",
    actions: [
      {
        label: "Open Folder…",
        execute: () => commands.executeCommand("vscode.openFolder"),
      },
    ],
    outputChannel: coverageOutputChannel,
  },
};
