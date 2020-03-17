/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 10th June 2019 1:00:54 pm
 * Copyright 2019 Espressif Systems (Shanghai) CO LTD
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as vscode from "vscode";
import * as winston from "winston";

export default class UserNotificationManagerTransport extends winston.Transport {
  constructor(options: any) {
    super(options);
  }

  protected log(
    level: string,
    message: string,
    metadata?: any,
    callback?: (arg1, arg2) => void
  ) {
    if (metadata && metadata.user) {
      if (level === "info") {
        vscode.window.showInformationMessage(message);
      } else if (level === "warn") {
        vscode.window.showWarningMessage(message);
      } else if (level === "error") {
        vscode.window.showErrorMessage(message);
      } else {
        winston.error(
          `Invalid error level '${level}' for user notification. ${message}`
        );
      }
    }
    super.emit("logged");
    if (callback) {
      callback(null, true);
    }
  }
}
