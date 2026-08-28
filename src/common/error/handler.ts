/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 26th June 2026 5:59:18 pm
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

import {
  ErrorSeverity,
  showNotificationWithMultipleActions,
} from "../customNotifications";
import { Logger } from "../logger";
import { OutputChannel } from "../outputChannel";
import { isKnownError, KnownError } from "./knownError";
import { resolveKnownErrorDescriptor } from "./resolve";
import { HandleErrorOptions } from "./types";

/**
 * Central error handler. All command errors funnel through here.
 */
export async function handleError(
  commandId: string,
  error: unknown,
  metadata?: Record<string, unknown>,
  options?: HandleErrorOptions
): Promise<void> {
  let mergedMetadata = {
    ...metadata,
    command: commandId,
  };
  // ── Known errors ──────────────────────────────────────────────
  if (isKnownError(error)) {
    const descriptor = resolveKnownErrorDescriptor(error, options);
    mergedMetadata = {
      ...mergedMetadata,
      ...(error instanceof KnownError ? error.metadata : {}),
      command: commandId,
    };
    if (descriptor) {
      const logMsg = `[${commandId}] ${descriptor.logMessage} (code: ${descriptor.code})`;
      if (descriptor.severity === ErrorSeverity.Warning) {
        Logger.warn(logMsg, mergedMetadata);
      } else if (descriptor.severity === ErrorSeverity.Error) {
        Logger.error(logMsg, error, `handleError ${commandId}`, mergedMetadata);
      } else {
        Logger.info(logMsg, mergedMetadata);
      }

      if (descriptor.outputChannel) {
        OutputChannel.appendLineAndShow(
          descriptor.userMessage,
          descriptor.outputChannel
        );
      }

      await showNotificationWithMultipleActions(
        descriptor.userMessage,
        descriptor.actions,
        descriptor.severity
      );
    } else {
      Logger.errorNotify(
        `[${commandId}] Unregistered KnownError code: ${error.code}`,
        error,
        `handleError ${commandId}`,
        mergedMetadata
      );
    }
    return;
  }

  // ── Unknown errors ────────────────────────────────────────────
  const commandError =
    error instanceof Error ? error : new Error(String(error));
  Logger.errorNotify(
    `[${commandId}] Unhandled error`,
    commandError,
    `handleError ${commandId}`,
    mergedMetadata
  );
}
