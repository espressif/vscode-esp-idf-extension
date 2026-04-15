/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 10th April 2026 2:55:48 pm
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

import { ExtensionContext } from "vscode";
import { registerIDFCommand } from "../common/registerCommand";
import { openFolderCheck, PreCheck, webIdeCheck } from "../common/PreCheck";
import { ESP } from "../config";
import { isFlashEncryptionEnabled } from "./verify/flashEncryption";
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
