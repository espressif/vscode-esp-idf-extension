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

export const rainmakerOutputChannel = "Rainmaker";

export const rainmakerCommandErrorMapping: CommandErrorMapping = {
  [ErrorCode.RainmakerLoginFailed]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "Failed to login with Rainmaker Cloud, double check your id and password.",
    logMessage: "Rainmaker login failed: {detail}.",
    actions: [],
    outputChannel: rainmakerOutputChannel,
  },
  [ErrorCode.RainmakerNodeDeleteFailed]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "Failed to delete node, maybe the node is already marked for delete, please try again after sometime.",
    logMessage: "Rainmaker node delete failed: {detail}.",
    actions: [],
    outputChannel: rainmakerOutputChannel,
  },
  [ErrorCode.RainmakerParamUpdateFailed]: {
    severity: ErrorSeverity.Error,
    userMessage: "Failed to update param because, {detail}",
    logMessage: "Rainmaker param update failed: {detail}.",
    actions: [],
    outputChannel: rainmakerOutputChannel,
  },
};
