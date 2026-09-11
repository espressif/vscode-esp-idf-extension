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

import { isKnownError, known } from "../common/error/knownError";
import { resolveKnownErrorUserMessage } from "../common/error/resolve";
import { ErrorCode } from "../common/error/types";
import { debugDapErrorPresentation } from "./debugErrorPresentation";

export function resolveDapErrorMessage(error: unknown): string {
  if (isKnownError(error)) {
    if (error.presentation) {
      return resolveKnownErrorUserMessage(error, { outputChannel: "Debug" });
    }
    if (error.code === ErrorCode.INVALID_CONFIGURATION) {
      return resolveKnownErrorUserMessage(
        known(
          error.code,
          error.metadata,
          debugDapErrorPresentation.invalidConfiguration
        )
      );
    }
    if (error.code === ErrorCode.TraceGdbProcessFailed) {
      return resolveKnownErrorUserMessage(
        known(
          error.code,
          error.metadata,
          debugDapErrorPresentation.traceGdbProcessFailed
        )
      );
    }
    return resolveKnownErrorUserMessage(error, { outputChannel: "Debug" });
  }
  return error instanceof Error ? error.message : String(error);
}
