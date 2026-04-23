/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import { ExtensionContext, l10n } from "vscode";
import { registerIDFCommand } from "../common/registerCommand";
import { withProgressWrapper } from "../common/withProgressWrapper";
import { openFolderCheck, webIdeCheck } from "../common/PreCheck";
import { readParameter } from "../idfConfiguration";
import { ESP } from "../config";
import { eraseFlashMain } from "./main";
import { Logger } from "../logger/logger";

export function registerEraseFlashCommand(context: ExtensionContext) {
  registerIDFCommand(context, "espIdf.eraseFlash", async () => {
    await withProgressWrapper(
      [webIdeCheck, openFolderCheck],
      l10n.t("ESP-IDF: Erasing device flash memory (erase_flash)"),
      async (_progress, cancelToken, wsFolder) => {
        if (!wsFolder) {
          Logger.infoNotify(l10n.t("No workspace selected."));
          return;
        }
        const workspaceFolderUri = wsFolder.uri;
        let flashType = readParameter(
          "idf.flashType",
          workspaceFolderUri
        ) as ESP.FlashType;

        await eraseFlashMain(workspaceFolderUri, cancelToken, flashType);
      }
    );
  });
}
