/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import { ConfigurationTarget, l10n, window, WorkspaceFolder } from "vscode";
import { readParameter, writeParameter } from "../configuration/idf";
import { ESP } from "../config";

export async function selectFlashMethod(workspaceFolder: WorkspaceFolder) {
  let curflashType = readParameter(
    "idf.flashType",
    workspaceFolder
  ) as ESP.FlashType;
  let newFlashType = (await window.showQuickPick(Object.keys(ESP.FlashType), {
    ignoreFocusOut: true,
    placeHolder: l10n.t(
      "Select flash method, you can modify the choice later from 'settings.json' (idf.flashType)"
    ),
  })) as ESP.FlashType;
  if (!newFlashType) {
    return curflashType;
  }
  await writeParameter(
    "idf.flashType",
    newFlashType,
    ConfigurationTarget.WorkspaceFolder,
    workspaceFolder
  );
  window.showInformationMessage(`Flash method changed to ${newFlashType}.`);
  return newFlashType;
}
