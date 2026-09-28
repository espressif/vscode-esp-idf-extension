/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 25th September 2026 10:00:00 am
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
  ConfigurationTarget,
  l10n,
  QuickPickItem,
  QuickPickOptions,
  window,
  WorkspaceFolder,
} from "vscode";
import { Logger } from "../../common/logger";
import { readParameter, writeParameter } from "../../configuration/idf";
import { updateOpenOcdAdapterStatusBarItem } from "../../statusBar";
import { clearAdapterSerial, getStoredAdapterSerial } from "./adapterSerial";
import { selectOpenOcdConfigFiles } from "./boardConfiguration";
import { OpenOCDManager } from "./openOcdManager";

export type AdapterCommandAction = "select" | "clear";

export interface AdapterCommandQuickPickItem extends QuickPickItem {
  action: AdapterCommandAction;
}

interface AdapterCommandTestHooks {
  showQuickPick?: (
    items: AdapterCommandQuickPickItem[],
    options: QuickPickOptions
  ) => Thenable<AdapterCommandQuickPickItem | undefined>;
  selectConnectedBoard?: (workspaceFolder: WorkspaceFolder) => Promise<void>;
  openOcdServer?: { isRunning(): boolean; stop(): void };
}

let testHooks: AdapterCommandTestHooks | undefined;

export function setAdapterCommandTestHooks(
  hooks?: AdapterCommandTestHooks
): void {
  testHooks = hooks;
}

export async function runOpenOcdAdapterCommand(
  wsFolder: WorkspaceFolder
): Promise<void> {
  const storedSerial = getStoredAdapterSerial(wsFolder.uri);
  const extraVars = (readParameter("idf.customExtraVars", wsFolder) || {}) as {
    [key: string]: any;
  };
  const storedLocation = extraVars["OPENOCD_USB_ADAPTER_LOCATION"] as
    | string
    | undefined;

  const items: AdapterCommandQuickPickItem[] = [
    {
      label: l10n.t("Select connected board"),
      description: l10n.t("Pin OpenOCD to a board that is connected right now"),
      action: "select",
    },
    {
      label: l10n.t("Clear adapter binding"),
      description: l10n.t(
        "Remove the stored serial and USB location and stop the OpenOCD server"
      ),
      action: "clear",
    },
  ];
  const options: QuickPickOptions = {
    placeHolder: l10n.t(
      "OpenOCD adapter: serial {0}, USB location {1}",
      storedSerial || "-",
      storedLocation || "-"
    ),
    ignoreFocusOut: true,
  };
  const showQuickPick = testHooks?.showQuickPick || window.showQuickPick;
  const selected = await showQuickPick(items, options);
  if (!selected) {
    return;
  }

  if (selected.action === "select") {
    const selectConnectedBoard =
      testHooks?.selectConnectedBoard || selectOpenOcdConfigFiles;
    await selectConnectedBoard(wsFolder);
    updateOpenOcdAdapterStatusBarItem(wsFolder.uri);
    return;
  }

  clearAdapterSerial(wsFolder.uri);
  if (storedLocation) {
    const nextExtraVars = { ...extraVars };
    delete nextExtraVars["OPENOCD_USB_ADAPTER_LOCATION"];
    await writeParameter(
      "idf.customExtraVars",
      nextExtraVars,
      ConfigurationTarget.WorkspaceFolder,
      wsFolder
    );
  }

  const openOcdServer = testHooks?.openOcdServer || OpenOCDManager.init();
  let stoppedOpenOcd = false;
  if (openOcdServer.isRunning()) {
    openOcdServer.stop();
    stoppedOpenOcd = true;
  }

  updateOpenOcdAdapterStatusBarItem(wsFolder.uri);

  if (!storedSerial && !storedLocation) {
    Logger.infoNotify(
      l10n.t("No OpenOCD adapter serial or USB location was stored.")
    );
    return;
  }
  Logger.infoNotify(
    stoppedOpenOcd
      ? l10n.t(
          "OpenOCD adapter serial and USB location cleared. OpenOCD server stopped."
        )
      : l10n.t("OpenOCD adapter serial and USB location cleared.")
  );
}
