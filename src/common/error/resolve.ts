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

import { ErrorSeverity, NotificationButton } from "../customNotifications";
import { Logger } from "../logger";
import { KnownError } from "./knownError";
import { openTaskFailedOutputInAiChat } from "./openTaskFailedChat";
import { getErrorDescriptor } from "./registry";
import {
  ErrorCode,
  ErrorPresentation,
  HandleErrorOptions,
  KnownErrorDescriptor,
} from "./types";

const unregisteredCodeWarnings = new Set<ErrorCode>();

const PROCESS_OUTPUT_AI_CHAT_CODES = new Set<ErrorCode>([
  ErrorCode.TaskFailedWithOutput,
  ErrorCode.ConfserverProcessFailed,
  ErrorCode.ConfserverProtocolError,
  ErrorCode.OpenOcdStartFailed,
  ErrorCode.OpenOcdProcessExited,
]);

export function interpolate(
  template: string,
  metadata?: Record<string, unknown>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    metadata?.[key] !== undefined ? String(metadata[key]) : `{${key}}`
  );
}

export function assertRegisteredErrorCode(code: ErrorCode): void {
  if (!getErrorDescriptor(code)) {
    throw new Error(`KnownError code is not registered: ${code}`);
  }
}

/**
 * Resolve the full descriptor for a KnownError.
 * Call-site {@link KnownError.presentation} wins over registry defaults.
 * Optional command {@link HandleErrorOptions.outputChannel} fills in when unset.
 */
export function resolveKnownErrorDescriptor(
  error: KnownError,
  options?: HandleErrorOptions
): KnownErrorDescriptor | undefined {
  const base = getErrorDescriptor(error.code);
  const presentation: ErrorPresentation | undefined = error.presentation;

  if (!base && !presentation) {
    if (!unregisteredCodeWarnings.has(error.code)) {
      unregisteredCodeWarnings.add(error.code);
      Logger.warn(
        `Unregistered KnownError code: ${error.code}. Register it in error/registry.ts.`,
        { code: error.code }
      );
    }
    return undefined;
  }

  const userMessage = interpolate(
    presentation?.userMessage ?? base?.userMessage ?? error.message,
    error.metadata
  );
  const logMessage = interpolate(
    presentation?.logMessage ?? base?.logMessage ?? error.message,
    error.metadata
  );

  const actions: NotificationButton[] = [
    ...(presentation?.actions ?? base?.actions ?? []),
  ];
  if (PROCESS_OUTPUT_AI_CHAT_CODES.has(error.code)) {
    actions.push({
      label: "Ask AI to Fix",
      execute: () => openTaskFailedOutputInAiChat(error.metadata),
    });
  }

  return {
    code: error.code,
    severity: presentation?.severity ?? base?.severity ?? ErrorSeverity.Error,
    userMessage,
    logMessage,
    actions,
    outputChannel:
      presentation?.outputChannel ??
      base?.outputChannel ??
      options?.outputChannel,
  };
}

export function resolveKnownErrorUserMessage(
  error: KnownError,
  options?: HandleErrorOptions
): string | undefined {
  return resolveKnownErrorDescriptor(error, options)?.userMessage;
}

export function resolveKnownErrorLogMessage(
  error: KnownError,
  options?: HandleErrorOptions
): string | undefined {
  return resolveKnownErrorDescriptor(error, options)?.logMessage;
}
