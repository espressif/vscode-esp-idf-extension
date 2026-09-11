/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 28th August 2026 3:58:00 pm
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

import { homedir } from "os";

export const PROCESS_TELEMETRY_ARGS_MAX_LENGTH = 500;
export const TELEMETRY_MESSAGE_MAX_LENGTH = 1000;
export const TELEMETRY_STACK_MAX_LENGTH = 4000;
export const REDACTED_PROCESS_ARG = "[redacted]";

export interface SanitizedProcessInvocation {
  processCommand: string;
  args: string;
  script?: string;
}

function stripQuotes(token: string): string {
  return token.replace(/^['"]+|['"]+$/g, "");
}

function fileBasename(token: string): string {
  const stripped = stripQuotes(token);
  const parts = stripped.split(/[/\\]/);
  return parts[parts.length - 1] || stripped;
}

function looksLikePath(token: string): boolean {
  const stripped = stripQuotes(token);
  if (!stripped) {
    return false;
  }
  if (stripped.includes("/") || stripped.includes("\\")) {
    return true;
  }
  return /^[a-zA-Z]:/.test(stripped);
}

function looksLikeSerialPort(token: string): boolean {
  const stripped = stripQuotes(token);
  if (/^com\d+$/i.test(stripped)) {
    return true;
  }
  return /^\/dev\/(tty|cu)/i.test(stripped);
}

function isPortFlag(token: string): boolean {
  return token === "-p" || token === "--port";
}

export function sanitizeArgToken(token: string, previousToken?: string): string {
  if (previousToken !== undefined && isPortFlag(previousToken)) {
    return REDACTED_PROCESS_ARG;
  }

  const portEquals = token.match(/^(--port=)(.*)$/i);
  if (portEquals) {
    return `${portEquals[1]}${REDACTED_PROCESS_ARG}`;
  }

  const eq = token.indexOf("=");
  if (eq > 0) {
    const key = token.slice(0, eq + 1);
    const value = token.slice(eq + 1);
    if (looksLikeSerialPort(value)) {
      return `${key}${REDACTED_PROCESS_ARG}`;
    }
    if (looksLikePath(value)) {
      return `${key}${fileBasename(value)}`;
    }
    return token;
  }

  if (looksLikeSerialPort(token)) {
    return REDACTED_PROCESS_ARG;
  }
  if (looksLikePath(token)) {
    return fileBasename(token);
  }
  return token;
}

export function firstPythonScript(args: string[]): string | undefined {
  for (const arg of args) {
    const base = fileBasename(arg.split("=")[0] || arg);
    if (base.toLowerCase().endsWith(".py")) {
      return base;
    }
  }
  return undefined;
}

function truncateArgs(args: string): string {
  if (args.length <= PROCESS_TELEMETRY_ARGS_MAX_LENGTH) {
    return args;
  }
  return `${args.slice(0, PROCESS_TELEMETRY_ARGS_MAX_LENGTH)}…`;
}

export function sanitizeProcessInvocation(
  command: string,
  args: string[] = []
): SanitizedProcessInvocation {
  if (args.length === 0 && /\s/.test(command.trim())) {
    const tokens = command.trim().split(/\s+/);
    return sanitizeProcessInvocation(tokens[0], tokens.slice(1));
  }
  const processCommand = looksLikePath(command)
    ? fileBasename(command)
    : command;
  const sanitizedArgs = args.map((arg, index) =>
    sanitizeArgToken(arg, args[index - 1])
  );
  const invocation: SanitizedProcessInvocation = {
    processCommand,
    args: truncateArgs(sanitizedArgs.join(" ")),
  };
  const script = firstPythonScript(args);
  if (script) {
    invocation.script = script;
  }
  return invocation;
}

export function capTelemetryText(text: string, max: number): string {
  if (!text || text.length <= max) {
    return text;
  }
  return `${text.slice(0, max)}… [truncated ${text.length - max} chars]`;
}

/**
 * Absolute paths carry the OS user name, so they are replaced before leaving
 * the machine. Both separators are handled for Windows paths.
 */
export function redactHomeDir(text: string): string {
  if (!text) {
    return text;
  }
  const home = homedir();
  if (!home) {
    return text;
  }
  const variants = new Set([home, home.replace(/\\/g, "/")]);
  let redacted = text;
  for (const variant of variants) {
    if (!variant) {
      continue;
    }
    redacted = redacted.split(variant).join("~");
  }
  return redacted;
}

export function sanitizeTelemetryText(text: string, max: number): string {
  return capTelemetryText(redactHomeDir(text), max);
}

export function processInvocationMetadata(
  command: string,
  args: string[] = []
): SanitizedProcessInvocation & { command: string } {
  const sanitized = sanitizeProcessInvocation(command, args);
  return {
    command: sanitized.processCommand,
    ...sanitized,
  };
}
