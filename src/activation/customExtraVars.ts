/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 4th November 2026
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

export type CustomExtraVarsLoadResult =
  | { setup: { idfPath: string } }
  | { detail: string }
  | undefined;

/** Non-empty IDF_PATH from idf.customExtraVars. */
export function customExtraVarsIdfPath(
  customVars: unknown
): string | undefined {
  if (
    customVars === null ||
    typeof customVars !== "object" ||
    Array.isArray(customVars)
  ) {
    return;
  }
  const idfPath = (customVars as { IDF_PATH?: unknown }).IDF_PATH;
  if (typeof idfPath !== "string" || idfPath.length === 0) {
    return;
  }
  return idfPath;
}

/**
 * Env-vars activation when customExtraVars names an IDF_PATH and that load succeeded.
 * Missing or rejected setups return undefined so catalog validation can continue.
 */
export function configuredFromEnvVarsDecision(
  customVars: unknown,
  loaded: CustomExtraVarsLoadResult,
  storedEnvReady: boolean
): { kind: "configuredFromEnvVars" } | undefined {
  if (!customExtraVarsIdfPath(customVars)) {
    return;
  }
  if (!loaded || !("setup" in loaded) || !storedEnvReady) {
    return;
  }
  return { kind: "configuredFromEnvVars" };
}
