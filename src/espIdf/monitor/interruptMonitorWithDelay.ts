/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import { Uri } from "vscode";
import { IDFMonitor } from ".";
import { readParameter } from "../../idfConfiguration";
import { sleep } from "../../utils";
import { ESP } from "../../config";

export async function interruptMonitorWithDelay(
  workspaceFolderUri: Uri
): Promise<void> {
  if (IDFMonitor.terminal) {
    IDFMonitor.terminal.sendText(ESP.CTRL_RBRACKET);
    const monitorDelay = readParameter(
      "idf.monitorDelay",
      workspaceFolderUri
    ) as number;
    await sleep(monitorDelay);
  }
}
