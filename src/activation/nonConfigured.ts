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

import {
  l10n,
  StatusBarAlignment,
  StatusBarItem,
  ThemeColor,
  window,
} from "vscode";
import { hideConfiguredStatusBarItems } from "../statusBar";
import { statusBarFailureTooltip } from "../eim/setupFailureDetail";
import { ActivationFailure } from "./validate";

let statusBarItem: StatusBarItem | undefined;

function failurePresentation(
  failure: ActivationFailure,
  detail?: string
): {
  text: string;
  tooltip: string;
  command: string;
} {
  switch (failure) {
    case "eimJsonMissing":
      return {
        text: l10n.t("eim_idf.json not found"),
        tooltip: statusBarFailureTooltip(l10n.t("Select eim_idf.json"), detail),
        command: "espIdf.selectEimIdfJson",
      };
    case "noFinishedSetup":
      return {
        text: l10n.t("No valid ESP-IDF setup found"),
        tooltip: statusBarFailureTooltip(
          l10n.t("Open ESP-IDF Installation Manager"),
          detail
        ),
        command: "espIdf.installManager",
      };
    case "invalidCurrentSetup":
      return {
        text: l10n.t("Invalid ESP-IDF Setup"),
        tooltip: statusBarFailureTooltip(
          l10n.t("Select current ESP-IDF version"),
          detail
        ),
        command: "espIdf.selectCurrentIdfVersion",
      };
  }
}

export function enterNonConfigured(
  failure: ActivationFailure,
  detail?: string
) {
  hideConfiguredStatusBarItems();
  const presentation = failurePresentation(failure, detail);
  if (!statusBarItem) {
    statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 110);
    statusBarItem.backgroundColor = new ThemeColor(
      "statusBarItem.warningBackground"
    );
  }
  statusBarItem.name = presentation.text;
  statusBarItem.text = `$(warning) ${presentation.text}`;
  statusBarItem.tooltip = presentation.tooltip;
  statusBarItem.command = presentation.command;
  statusBarItem.show();
}

export function enterUndetected() {
  hideConfiguredStatusBarItems();
  const text = l10n.t("No ESP-IDF project detected");
  if (!statusBarItem) {
    statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 110);
    statusBarItem.backgroundColor = new ThemeColor(
      "statusBarItem.warningBackground"
    );
  }
  statusBarItem.name = text;
  statusBarItem.text = `$(warning) ${text}`;
  statusBarItem.tooltip = l10n.t(
    "Activate the ESP-IDF extension for this workspace"
  );
  statusBarItem.command = "espIdf.activateAnyway";
  statusBarItem.show();
}

export function disposeNonConfiguredStatusBar() {
  statusBarItem?.dispose();
  statusBarItem = undefined;
}
