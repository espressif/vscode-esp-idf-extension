/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import { ConfigurationTarget, l10n, Uri, window } from "vscode";
import { readParameter, writeParameter } from "../idfConfiguration";
import { ESP } from "../config";

export async function selectFlashMethod(workspaceFolderUri: Uri) {
  let curflashType = readParameter(
    "idf.flashType",
    workspaceFolderUri
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
    workspaceFolderUri
  );
  window.showInformationMessage(`Flash method changed to ${newFlashType}.`);
  return newFlashType;
}
