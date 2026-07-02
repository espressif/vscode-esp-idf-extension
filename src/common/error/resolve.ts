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

import { ErrorSeverity } from "../customNotifications";
import { Logger } from "../logger";
import { KnownError } from "./knownError";
import { getErrorDescriptor } from "./registry";
import { CommandErrorMapping, ErrorCode, KnownErrorDescriptor } from "./types";

const unregisteredCodeWarnings = new Set<ErrorCode>();

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
 * Resolve the full descriptor for a KnownError, applying any
 * command-level overrides on top of the global defaults.
 */
export function resolveKnownErrorDescriptor(
  error: KnownError,
  commandOverrides?: CommandErrorMapping
): KnownErrorDescriptor | undefined {
  const base = getErrorDescriptor(error.code);
  const override = commandOverrides?.[error.code];

  if (!base && !override) {
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
    outputChannel: override?.outputChannel ?? base?.outputChannel,
  };
}

export function resolveKnownErrorUserMessage(
  error: KnownError,
  commandOverrides?: CommandErrorMapping
): string | undefined {
  return resolveKnownErrorDescriptor(error, commandOverrides)?.userMessage;
}

export function resolveKnownErrorLogMessage(
  error: KnownError,
  commandOverrides?: CommandErrorMapping
): string | undefined {
  return resolveKnownErrorDescriptor(error, commandOverrides)?.logMessage;
}

/** @internal Test helper to reset one-time unregistered-code warnings. */
export function resetUnregisteredCodeWarningsForTests(): void {
  unregisteredCodeWarnings.clear();
}
