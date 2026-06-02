/*
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

import { debug } from "vscode";
import { Logger } from "../../logger/logger";

export type DebugVariableCommandContext = {
  container: {
    expensive: boolean;
    name: string;
    variablesReference: number;
  };
  sessionId: string;
  variable: {
    evaluateName: string;
    memoryReference: string;
    name: string;
    value: string;
    variablesReference: number;
    type?: string;
  };
};

export function errorMessageFromUnknown(e: unknown): string {
  return e instanceof Error && e.message ? e.message : String(e);
}

export function notifyCommandError(e: unknown, scope: string): void {
  Logger.errorNotify(errorMessageFromUnknown(e), e as Error, scope);
}

export function isVariableCommandContextReady(
  ctx: DebugVariableCommandContext | undefined
): boolean {
  return !!(
    ctx?.variable?.evaluateName &&
    debug.activeDebugSession
  );
}

export function isImageVariableCommandContextReady(
  ctx: DebugVariableCommandContext | undefined
): ctx is DebugVariableCommandContext & {
  variable: DebugVariableCommandContext["variable"] & { type: string };
} {
  if (!isVariableCommandContextReady(ctx) || !ctx) {
    return false;
  }
  return typeof ctx.variable.type === "string";
}
