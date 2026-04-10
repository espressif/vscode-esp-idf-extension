/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import { Uri } from "vscode";
import { ESP } from "../config";
import { readParameter } from "../idfConfiguration";
import { IDFMonitor } from "../espIdf/monitor";
import { sleep } from "../utils";

export async function interruptMonitorForFlashOperation(
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
