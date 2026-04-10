/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import { ExtensionContext, l10n } from "vscode";
import { openFolderCheck, webIdeCheck } from "../../common/PreCheck";
import { registerIDFCommand } from "../../common/registerCommand";
import { withProgressWrapper } from "../../common/withProgressWrapper";
import { ESP } from "../../config";
import * as idfConf from "../../idfConfiguration";
import { Logger } from "../../logger/logger";
import { OutputChannel } from "../../logger/outputChannel";
import { TaskManager } from "../../taskManager";
import * as utils from "../../utils";
import { getIdfTargetFromSdkconfig } from "../../workspaceConfig";
import { isFlashEncryptionEnabled } from "../verifyFlashEncryption";
import { EraseFlashTask } from "./task";
import { jtagEraseFlashCommand } from "./jtag";
import { interruptMonitorForFlashOperation } from "../interruptMonitorForFlashOperation";
import { selectFlashMethod } from "../selectFlashMethod";

export function registerEraseFlashCommand(context: ExtensionContext) {
  registerIDFCommand(context, "espIdf.eraseFlash", async () => {
    await withProgressWrapper(
      [webIdeCheck, openFolderCheck],
      l10n.t("ESP-IDF: Erasing device flash memory (erase_flash)"),
      async (_progress, cancelToken, wsFolder) => {
        const workspaceFolderUri = wsFolder!.uri;
        try {
          let flashType = idfConf.readParameter(
            "idf.flashType",
            workspaceFolderUri
          ) as ESP.FlashType;
          if (!flashType) {
            flashType = await selectFlashMethod(workspaceFolderUri);
          }
          await interruptMonitorForFlashOperation(workspaceFolderUri);
          const isEncrypted = await isFlashEncryptionEnabled(workspaceFolderUri);

          const secureBoot = await utils.getConfigValueFromSDKConfig(
            "CONFIG_SECURE_BOOT",
            workspaceFolderUri
          );
          const isSecureBootEnabled = secureBoot === "y";
          if (isEncrypted || isSecureBootEnabled) {
            Logger.warnNotify(
              l10n.t(
                "Flash encryption or secure boot is enabled on the sdkconfig. Erasing flash will permanently remove the encryption keys and may render the device unusable."
              )
            );
            return;
          }
          if (flashType === ESP.FlashType.JTAG) {
            OutputChannel.appendLine(
              "Erasing flash via JTAG...",
              "Erase flash"
            );
            await jtagEraseFlashCommand(workspaceFolderUri);
            const msg =
              "JTAG erase flash finished. Check Output channel to see results.";
            OutputChannel.appendLine(msg, "Erase flash");
            Logger.infoNotify(msg);
          } else {
            cancelToken.onCancellationRequested(() => {
              TaskManager.cancelTasks();
              TaskManager.disposeListeners();
              EraseFlashTask.isErasing = false;
              return;
            });
            const port = await idfConf.readSerialPort(workspaceFolderUri, false);
            if (!port) {
              Logger.warnNotify(
                l10n.t(
                  "No serial port found for current IDF_TARGET: {0}",
                  await getIdfTargetFromSdkconfig(workspaceFolderUri)
                )
              );
              return;
            }
            const eraseFlashTask = new EraseFlashTask(workspaceFolderUri);
            await eraseFlashTask.eraseFlash(port);
            await TaskManager.runTasks();
            if (!cancelToken.isCancellationRequested) {
              EraseFlashTask.isErasing = false;
              const msg = "⚡️ Erase flash done";
              OutputChannel.appendLine(msg, "Erase flash");
              Logger.infoNotify(msg);
              OutputChannel.appendLine(
                "Flash memory content has been erased."
              );
              Logger.infoNotify("Flash memory content has been erased.");
            }
            TaskManager.disposeListeners();
          }
        } catch (error: any) {
          EraseFlashTask.isErasing = false;
          TaskManager.disposeListeners();
          Logger.errorNotify(error.message, error, "flash eraseFlashCommand");
        }
      }
    );
  });
}
