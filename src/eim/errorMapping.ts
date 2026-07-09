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

import { env, Uri } from "vscode";
import { ErrorSeverity } from "../common/customNotifications";
import { CommandErrorMapping, ErrorCode } from "../common/error/types";
import { ESP } from "../config";

export const eimOutputChannel = "EIM";

export const eimCommandErrorMapping: CommandErrorMapping = {
  [ErrorCode.NO_WORKSPACE_OPEN]: {
    severity: ErrorSeverity.Warning,
    userMessage: "Open a workspace folder before selecting an ESP-IDF version.",
    logMessage: "Select ESP-IDF version blocked: no workspace open.",
    actions: [],
    outputChannel: eimOutputChannel,
  },
  [ErrorCode.EimDownloadCanceled]: {
    severity: ErrorSeverity.Info,
    userMessage: "EIM download was canceled.",
    logMessage: "EIM download canceled by user.",
    actions: [],
    outputChannel: eimOutputChannel,
  },
  [ErrorCode.EimDownloadFailed]: {
    severity: ErrorSeverity.Error,
    userMessage: "EIM download or installation failed: {detail}",
    logMessage: "EIM download/install failed: {detail}.",
    actions: [
      {
        label: "Open Releases URL",
        execute: () => env.openExternal(Uri.parse(ESP.URL.InstallManager.Releases)),
      },
    ],
    outputChannel: eimOutputChannel,
  },
  [ErrorCode.EimAssetNotFound]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "No EIM release asset found for this platform: {assetName}.",
    logMessage: "EIM asset not found in release manifest: {assetName}.",
    actions: [
      {
        label: "Open Releases URL",
        execute: () => env.openExternal(Uri.parse(ESP.URL.InstallManager.Releases)),
      },
    ],
    outputChannel: eimOutputChannel,
  },
  [ErrorCode.EnvironmentNotSupported]: {
    severity: ErrorSeverity.Error,
    userMessage: "EIM is not supported on {envName}.",
    logMessage: "EIM install blocked: unsupported environment {envName}.",
    actions: [],
    outputChannel: eimOutputChannel,
  },
};
