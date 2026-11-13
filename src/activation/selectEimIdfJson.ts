/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 12th October 2026
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

import { ConfigurationTarget, l10n, window } from "vscode";
import { writeParameter } from "../configuration/idf";

export type MissingEimIdfJsonChoice = "install" | "select";

export async function promptMissingEimIdfJson(): Promise<
  MissingEimIdfJsonChoice | undefined
> {
  const installLabel = l10n.t("Open ESP-IDF Installation Manager");
  const selectLabel = l10n.t("Select eim_idf.json");
  const choice = await window.showWarningMessage(
    l10n.t(
      "eim_idf.json was not found. Install ESP-IDF with the ESP-IDF Installation Manager, or select a custom eim_idf.json location."
    ),
    installLabel,
    selectLabel
  );
  if (choice === installLabel) {
    return "install";
  }
  if (choice === selectLabel) {
    return "select";
  }
  return undefined;
}

export async function selectEimIdfJsonFile(): Promise<boolean> {
  const selected = await window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    filters: { "EIM IDF JSON": ["json"] },
    openLabel: l10n.t("Select eim_idf.json"),
  });
  if (!selected?.length) {
    return false;
  }
  await writeParameter(
    "idf.eimIdfJsonPath",
    selected[0].fsPath,
    ConfigurationTarget.Global
  );
  return true;
}
