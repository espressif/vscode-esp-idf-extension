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

export type CalculationTrace = "app" | "heap";

/**
 * postMessage structured-clones Error into {}. Read message here, on the
 * extension side, and send the resulting string.
 */
export function formatCalculationError(
  error: unknown,
  trace: CalculationTrace
): string {
  const message = calculationErrorText(error);
  if (message) {
    return message;
  }
  return trace === "app"
    ? "App trace calculation failed"
    : "Heap trace calculation failed";
}

function calculationErrorText(error: unknown): string {
  if (typeof error === "string") {
    return error.trim();
  }
  if (error instanceof Error) {
    return error.message.trim();
  }
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      return message.trim();
    }
  }
  return "";
}
