/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Saturday, 23rd May 2020 12:46:45 pm
 * Copyright 2020 Espressif Systems (Shanghai) CO LTD
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

import TelemetryReporter from "@vscode/extension-telemetry";
import { extensions } from "vscode";
import { Logger } from "../logger/logger";
import { exceptionFingerprint } from "./exceptionFingerprint";

export class Telemetry {
  private static reporter?: TelemetryReporter;
  private static instance: Telemetry;
  private static enabled: boolean;
  private static reportedExceptions = new Set<string>();
  public static init(isEnabled: boolean) {
    if (!this.instance) {
      this.instance = new Telemetry(isEnabled);
    }
    return this.instance;
  }
  private constructor(isEnabled: boolean) {
    const extensionID = "espressif.esp-idf-extension";
    const extension = extensions.getExtension(extensionID);
    const version = extension.packageJSON.version;
    const key = extension.packageJSON.azure.insight.key;

    try {
      Telemetry.reporter = new TelemetryReporter(extensionID, version, key);
      Telemetry.enabled =
        isEnabled && process.env["VSCODE_EXTENSION_MODE"] !== "development";
    } catch (error) {
      Logger.telemetryError(`Failed to load TelemetryReporter`, error);
    }
  }
  public static dispose() {
    this.reportedExceptions.clear();
    this.reporter?.dispose();
  }

  public static sendEvent(
    name: string,
    properties?: {
      [key: string]: string;
    },
    measurements?: {
      [key: string]: number;
    }
  ) {
    if (this.enabled) {
      try {
        return this.reporter?.sendTelemetryEvent(
          name,
          properties,
          measurements
        );
      } catch (error) {
        Logger.telemetryError("Failed to sendEvent", error);
      }
    }
  }

  public static sendException(
    error: Error,
    properties?: {
      [key: string]: string;
    },
    measurements?: {
      [key: string]: number;
    }
  ) {
    if (!this.enabled) {
      return;
    }

    try {
      const fingerprint = exceptionFingerprint(error, properties);
      if (this.reportedExceptions.has(fingerprint)) {
        return;
      }
      this.reportedExceptions.add(fingerprint);

      return this.reporter?.sendTelemetryException(
        error,
        properties,
        measurements
      );
    } catch (telemetryError) {
      Logger.telemetryError("Failed to sendException", telemetryError);
    }
  }
}
