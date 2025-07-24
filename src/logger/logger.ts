/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 5th June 2019 2:03:34 pm
 * Copyright 2019 Espressif Systems (Shanghai) CO LTD
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

import * as vscode from "vscode";
import * as winston from "winston";
import UserNotificationManagerTransport from "../userNotificationManager/userNotificationManager";
import { Telemetry } from "../telemetry";

export class Logger {
  public static init(context: vscode.ExtensionContext): Logger {
    Logger.instance = new Logger(context);
    return Logger.instance;
  }

  public static infoNotify(message: string, metadata?: any) {
    if (!metadata) {
      metadata = {};
    }
    metadata.user = true;
    Logger.info(message, metadata);
  }

  public static info(message: string, metadata?: any) {
    Logger.checkInitialized();
    winston.info(message, metadata);
  }

  public static warnNotify(message: string, metadata?: any) {
    if (!metadata) {
      metadata = {};
    }
    metadata.user = true;
    Logger.warn(message, metadata);
  }

  public static warn(message: string, metadata?: any) {
    Logger.checkInitialized();
    winston.warn(message, metadata);
  }

  public static errorNotify(
    message: string,
    error: Error,
    category: string,
    metadata?: any,
    sendTelemetry: boolean = true
  ) {
    if (!metadata) {
      metadata = {};
    }
    metadata.user = true;
    Logger.error(message, error, category, metadata, sendTelemetry);
  }

  public static error(
    message: string,
    error: Error,
    category: string,
    metadata?: any,
    sendTelemetry: boolean = true
  ) {
    Logger.checkInitialized();
    if (sendTelemetry) {
      Telemetry.sendException(error, {
        givenMessage: message,
        errorMessage: error.message,
        errorStack: error.stack,
        category,
        capturedBy: "Logger",
      });
    }
    winston.log("error", message, {
      ...metadata,
      message: error.message,
      stack: error.stack,
      category,
    });
  }

  public static telemetryError(message: string, error: Error, metadata?: any) {
    Logger.checkInitialized();
    winston.log("error", message, {
      errorMessage: `[Telemetry]: ${message}`,
      stack: error.stack,
      metadata,
    });
  }

  private static instance: Logger;

  private static checkInitialized() {
    if (!Logger.instance) {
      throw new Error(
        "need to initialize the logger first use:: Logger.init()"
      );
    }
  }

  private LOG_FILE_NAME = "esp_idf_vsc_ext.log";

  private constructor(context: vscode.ExtensionContext) {
    winston.configure({
      transports: [
        new winston.transports.File({
          filename: context.asAbsolutePath(this.LOG_FILE_NAME),
          level: "warn",
        }),
        new UserNotificationManagerTransport({
          level: "info",
        }),
      ],
    });
  }
}
