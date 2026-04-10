/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import { ExtensionContext } from "vscode";
import { registerIDFCommand } from "../common/registerCommand";
import { openFolderCheck, PreCheck, webIdeCheck } from "../common/PreCheck";
import { ESP } from "../config";
import { isFlashEncryptionEnabled } from "./verifyFlashEncryption";
import { flash } from "./flashProject";
import { selectFlashMethod } from "./selectFlashMethod";
import { registerEraseFlashCommand } from "./eraseFlash/command";

async function flashWithEncryptionResolution(options: {
  explicitFlashType?: ESP.FlashType;
  partition?: ESP.BuildType;
}) {
  const ws = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
  const isEncrypted = ws ? await isFlashEncryptionEnabled(ws.uri) : false;
  return flash(isEncrypted, options.explicitFlashType, options.partition);
}

export function registerFlashCommands(context: ExtensionContext) {
  registerIDFCommand(context, "espIdf.jtag_flash", () =>
    flash(false, ESP.FlashType.JTAG)
  );
  registerIDFCommand(context, "espIdf.flashDFU", () =>
    flash(false, ESP.FlashType.DFU)
  );
  registerIDFCommand(context, "espIdf.flashUart", () =>
    flashWithEncryptionResolution({ explicitFlashType: ESP.FlashType.UART })
  );
  registerIDFCommand(context, "espIdf.flashDevice", () =>
    flashWithEncryptionResolution({})
  );
  registerIDFCommand(context, "espIdf.flashAndEncryptDevice", () =>
    flash(true)
  );

  registerIDFCommand(context, "espIdf.flashAppUart", () =>
    flashWithEncryptionResolution({
      explicitFlashType: ESP.FlashType.UART,
      partition: ESP.BuildType.App,
    })
  );

  registerIDFCommand(context, "espIdf.flashBootloaderUart", () =>
    flashWithEncryptionResolution({
      explicitFlashType: ESP.FlashType.UART,
      partition: ESP.BuildType.Bootloader,
    })
  );

  registerIDFCommand(context, "espIdf.flashPartitionTableUart", () =>
    flashWithEncryptionResolution({
      explicitFlashType: ESP.FlashType.UART,
      partition: ESP.BuildType.PartitionTable,
    })
  );

  registerIDFCommand(context, "espIdf.selectFlashMethodAndFlash", () => {
    PreCheck.perform([openFolderCheck, webIdeCheck], async () => {
      const ws = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
      await selectFlashMethod(ws!.uri);
    });
  });

  registerEraseFlashCommand(context);
}
