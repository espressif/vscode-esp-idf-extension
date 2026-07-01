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
import { isKnownError, KnownError } from "./knownError";
import { getErrorDescriptor } from "./registry";
import { CommandErrorMapping, KnownErrorDescriptor } from "./types";

function interpolate(
  template: string,
  metadata?: Record<string, unknown>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    metadata?.[key] !== undefined ? String(metadata[key]) : `{${key}}`
  );
}

/**
 * Resolve the full descriptor for a KnownError, applying any
 * command-level overrides on top of the global defaults.
 */
function resolveDescriptor(
  error: KnownError,
  commandOverrides?: CommandErrorMapping
): KnownErrorDescriptor | undefined {
  const base = getErrorDescriptor(error.code);
  const override = commandOverrides?.[error.code];

  if (!base && !override) {
    return undefined;
  }

  const userMessage = interpolate(
    override?.userMessage ?? base?.userMessage ?? error.message,
    error.metadata
  );
  const logMessage = interpolate(
    override?.logMessage ?? base?.logMessage ?? error.message,
    error.metadata
  );

  return {
    code: error.code,
    severity: override?.severity ?? base?.severity ?? ErrorSeverity.Error,
    userMessage,
    logMessage,
    actions: override?.actions ?? base?.actions ?? [],
  };
}

/**
 * Central error handler. All command errors funnel through here.
 */
export async function handleError(
  commandId: string,
  error: unknown,
  metadata?: Record<string, unknown>,
  commandOverrides?: CommandErrorMapping
): Promise<void> {
  let mergedMetadata = {
    ...metadata,
    command: commandId,
  };
  // ── Known errors ──────────────────────────────────────────────
  if (isKnownError(error)) {
    const descriptor = resolveDescriptor(error, commandOverrides);
    mergedMetadata = {
      ...mergedMetadata,
      ...(error instanceof KnownError ? error.metadata : {}),
    };
    if (descriptor) {
      // Log with appropriate level
      const logMsg = `[${commandId}] ${descriptor.logMessage} (code: ${descriptor.code})`;
      if (descriptor.severity === ErrorSeverity.Warning) {
        Logger.warn(logMsg, mergedMetadata);
      } else if (descriptor.severity === ErrorSeverity.Error) {
        Logger.error(logMsg, error, `handleError ${commandId}`, mergedMetadata);
      } else {
        Logger.info(logMsg, mergedMetadata);
      }

      // Notify the user
      await showNotificationWithMultipleActions(
        descriptor.userMessage,
        descriptor.actions,
        descriptor.severity
      );
    } else {
      // KnownError with an unregistered code — treat as semi-unknown
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
