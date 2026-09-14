/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 15th June 2026 6:07:00 pm
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

import { ConfigurationTarget, env, l10n, window } from "vscode";
import { readParameter, writeParameter } from "../configuration/idf";
import { launchEimInTerminal } from "./downloadInstall";

export async function showSnapEimNotification(eimPath: string) {
  const runCliLabel = l10n.t("Run EIM in Terminal");
  const copyPathLabel = l10n.t("Copy EIM Path");

  const message = l10n.t(
    "VS Code installed via Snap cannot launch EIM's GUI due to sandbox restrictions. You can run EIM in CLI mode directly from the integrated terminal, or copy the path to run the GUI manually from a system terminal."
  );

  const action = await window.showWarningMessage(
    message,
    { modal: true },
    runCliLabel,
    copyPathLabel
  );

  if (action === runCliLabel) {
    const raw = readParameter("idf.eimExecutableArgs");
    const existing = Array.isArray(raw) ? raw : [];
    const merged = [
      "wizard",
      "--idf-features ide",
      ...existing.filter(
        (arg) =>
          arg !== "gui" && arg !== "wizard" && arg !== "--idf-features ide"
      ),
    ];
    await writeParameter(
      "idf.eimExecutableArgs",
      merged,
      ConfigurationTarget.Global
    );
    await launchEimInTerminal(eimPath);
  } else if (action === copyPathLabel) {
    await env.clipboard.writeText(eimPath);
    window.showInformationMessage(
      l10n.t(
        "EIM path copied to clipboard. Open a system terminal and paste it to run."
      )
    );
  }
}
