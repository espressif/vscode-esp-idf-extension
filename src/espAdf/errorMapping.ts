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

import { ErrorSeverity } from "../common/customNotifications";
import { CommandErrorMapping, ErrorCode } from "../common/error/types";
import { OutputChannel } from "../common/outputChannel";

export const espAdfOutputChannel = "ESP-ADF";

export const espAdfCommandErrorMapping: CommandErrorMapping = {
  [ErrorCode.NO_WORKSPACE_OPEN]: {
    severity: ErrorSeverity.Warning,
    userMessage: "Open a workspace folder before installing ESP-ADF.",
    logMessage: "ESP-ADF install blocked: no workspace open.",
    actions: [],
    outputChannel: espAdfOutputChannel,
  },
  [ErrorCode.MISSING_DEPENDENCY]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "Required dependency {dependency} is missing. Install it and ensure it is in your PATH.",
    logMessage: "ESP-ADF install blocked: missing dependency {dependency}.",
    actions: [
      {
        label: "View Output",
        execute: () => OutputChannel.show(),
      },
    ],
    outputChannel: espAdfOutputChannel,
  },
  [ErrorCode.RepositoryCloneFailed]: {
    severity: ErrorSeverity.Error,
    userMessage: "Failed to clone {repoName}. {detail}",
    logMessage: "ESP-ADF repository clone failed: {detail}.",
    actions: [
      {
        label: "View Output",
        execute: () => OutputChannel.show(),
      },
    ],
    outputChannel: espAdfOutputChannel,
  },
};
