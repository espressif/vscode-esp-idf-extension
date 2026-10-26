/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 26th October 2026
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

import { l10n } from "vscode";

export function missingActivationScriptDetail(
  idfPath: string,
  scriptPath: string
): string {
  return l10n.t(
    "Activation script for {0} does not exist: {1}.",
    idfPath,
    scriptPath
  );
}

export function installStatusDetail(idfPath: string, status: string): string {
  return l10n.t("The ESP-IDF install at {0} is {1}.", idfPath, status);
}

export function currentSetupNotFinishedDetail(idfPath: string): string {
  return l10n.t(
    "idf.currentSetup {0} is not a finished ESP-IDF setup.",
    idfPath
  );
}

export function missingIdfEnvDetail(): string {
  return l10n.t(
    "The ESP-IDF environment is missing IDF_PATH, PATH, or IDF_PYTHON_ENV_PATH."
  );
}

export function couldNotSaveCurrentSetupDetail(): string {
  return l10n.t("Could not save idf.currentSetup.");
}

export function statusBarFailureTooltip(
  action: string,
  detail?: string
): string {
  if (!detail) {
    return action;
  }
  return `${detail}\n${action}`;
}
