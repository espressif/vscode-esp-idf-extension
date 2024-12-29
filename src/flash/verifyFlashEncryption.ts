import * as idfConf from "../idfConfiguration";
import { Logger } from "../logger/logger";
import { OutputChannel } from "../logger/outputChannel";
import { ESP } from "../config";
import {
  showInfoNotificationWithLink,
  showQuickPickWithCustomActions,
} from "../logger/utils";
import { ConfserverProcess } from "../espIdf/menuconfig/confServerProcess";
import { ESPEFuseManager } from "../efuse";
import { getDocsUrl } from "../espIdf/documentation/getDocsVersion";
import * as utils from "../utils";
import * as vscode from "vscode";
import { getIdfTargetFromSdkconfig } from "../workspaceConfig";

export enum FlashCheckResultType {
  Success,
  ErrorInvalidFlashType,
  ErrorEfuseNotSet,
  ErrorEncryptionArgsRequired,
  GenericError,
}

export interface FlashCheckResult {
  success: boolean;
  resultType?: FlashCheckResultType;
}

export async function isFlashEncryptionEnabled(workspaceRoot: vscode.Uri) {
  const flashEncryption = await utils.getConfigValueFromSDKConfig(
    "CONFIG_FLASH_ENCRYPTION_ENABLED",
    workspaceRoot
  );
  return flashEncryption === "y";
}

export async function checkFlashEncryption(
  flashType: ESP.FlashType,
  workspaceRoot: vscode.Uri
): Promise<FlashCheckResult> {
  Logger.info(`Using flash type: ${flashType}`, { tag: "Flash" });

  try {
    if (flashType !== ESP.FlashType.UART) {
      const errorMessage = `Invalid flash type for partition encryption. Required: UART, Found: ${flashType}. \n Choose one of the actions presented in the top center quick pick menu and re-flash.`;
      const error = new Error(errorMessage);
      const customButtons = [
        {
          label: "Change flash type to UART",
          action: () => {
            idfConf.writeParameter(
              "idf.flashType",
              "UART",
              vscode.ConfigurationTarget.WorkspaceFolder,
              workspaceRoot
            );
            const saveMessage = vscode.l10n.t(
              "Flashing method successfully changed to UART"
            );
            Logger.infoNotify(saveMessage);
            OutputChannel.appendLineAndShow(saveMessage, "Flash Encryption");
          },
        },
        {
          label: "Disable Flash Encryption",
          action: () => {
            disableFlashEncryption();
            const saveMessage = vscode.l10n.t(
              "Flash encryption has been disabled in the SDK configuration"
            );
            Logger.infoNotify(saveMessage);
            OutputChannel.appendLineAndShow(saveMessage, "Flash Encryption");
          },
        },
      ];

      OutputChannel.appendLineAndShow(errorMessage, "Flash Encryption");
      Logger.errorNotify(
        errorMessage,
        error,
        "verifyFlashEncryption !ESP.FlashType.UART",
        { tag: "Flash Encryption" }
      );
      await showQuickPickWithCustomActions(
        "Pick one of the following actions to continue",
        customButtons
      );
      return {
        success: false,
        resultType: FlashCheckResultType.ErrorInvalidFlashType,
      };
    }

    const valueEncryptionEnabled = await utils.getConfigValueFromBuild(
      "SECURE_FLASH_ENC_ENABLED",
      workspaceRoot
    );
    if (!valueEncryptionEnabled) {
      const errorMessage =
        "Flash encryption is enabled in the SDK configuration, but the project has not been rebuilt with these settings. Please rebuild the project to apply the encryption settings before attempting to flash the device.";
      const error = new Error(errorMessage);
      OutputChannel.appendLineAndShow(errorMessage, "Flash Encryption");
      Logger.errorNotify(
        errorMessage,
        error,
        "verifyFlashEncryption !valueEncryptionEnabled",
        { tag: "Flash Encryption" }
      );

      return {
        success: false,
        resultType: FlashCheckResultType.ErrorEncryptionArgsRequired,
      };
    }

    const idfTarget = await getIdfTargetFromSdkconfig(workspaceRoot);
    const eFuse = new ESPEFuseManager(workspaceRoot);

    const notificationMode = idfConf.readParameter(
      "idf.notificationMode",
      workspaceRoot
    ) as string;
    const ProgressLocation =
      notificationMode === idfConf.NotificationMode.All ||
      notificationMode === idfConf.NotificationMode.Notifications
        ? vscode.ProgressLocation.Notification
        : vscode.ProgressLocation.Window;
    const data = await vscode.window.withProgress(
      {
        cancellable: true,
        location: ProgressLocation,
        title: "ESP-IDF: Checking encryption eFuse...",
      },
      async (
        progress: vscode.Progress<{
          message?: string;
          increment?: number;
        }>,
        cancelToken: vscode.CancellationToken
      ) => {
        return new Promise(async (resolve, reject) => {
          // Register cancellation handler
          cancelToken.onCancellationRequested(() => {
            Logger.info("eFuse check cancelled by user", {
              tag: "Flash Encryption",
            });
            reject(new Error("Operation cancelled by user"));
          });

          try {
            // Start the eFuse reading operation
            progress.report({ message: "Reading eFuse data..." });
            const summary = await eFuse.readSummary();

            if (cancelToken.isCancellationRequested) {
              reject(new Error("Operation cancelled by user"));
              return;
            }

            resolve(summary);
          } catch (error) {
            Logger.errorNotify(
              "Failed to read eFuse summary",
              error,
              "verifyFlashEncryption readSummary",
              { tag: "Flash Encryption" }
            );
            reject(error);
          }
        });
      }
    );

    // ESP32 boards have property FLASH_CRYPT_CNT
    // All other boards have property SPI_BOOT_CRYPT_CNT
    // The values of these properties can be: 0 or 1 for ESP32
    // Or "Disable", "Enable" for the rest of the boards
    const fieldEncription =
      idfTarget === "esp32" ? "FLASH_CRYPT_CNT" : "SPI_BOOT_CRYPT_CNT";

    if (data && data[fieldEncription]) {
      if (
        // eFuse is not set
        data[fieldEncription] &&
        (data[fieldEncription].value === 0 ||
          data[fieldEncription].value == "Disable")
      ) {
        const documentationUrl = await getDocsUrl(
          ESP.URL.Docs.FLASH_ENCRYPTION,
          workspaceRoot
        );
        const warnMessage =
          "Encryption setup requires a two-step flashing process due to uninitialized eFuse BLOCK_KEY0. Please complete the current flash, reset your device, and then flash again. See documentation for details.";
        showInfoNotificationWithLink(warnMessage, documentationUrl);
        OutputChannel.appendLineAndShow(warnMessage, "Flash Encryption");
        Logger.info(warnMessage, { tag: "Flash Encryption" });
        return {
          success: false,
          resultType: FlashCheckResultType.ErrorEfuseNotSet,
        };
      }
      // eFuse is set
      return { success: true };
    } else {
      const errorMessage = `Could not find Encryption Key for ${idfTarget}.`;
      OutputChannel.appendLineAndShow(errorMessage, "Flash Encryption");
      Logger.info(errorMessage, { tag: "Flash Encryption" });
      return {
        success: false,
        resultType: FlashCheckResultType.ErrorEfuseNotSet,
      };
    }
  } catch (error) {
    if (error.message === "Operation cancelled by user") {
      OutputChannel.appendLineAndShow(
        "eFuse check cancelled by user",
        "Flash Encryption"
      );
      return {
        success: false,
        resultType: FlashCheckResultType.GenericError,
      };
    }

    OutputChannel.appendLineAndShow(error.message);
    Logger.errorNotify(
      error.message,
      error,
      "verifyFlashEncryption checkFlashEncryption",
      { tag: "Flash Encryption" }
    );
    return { success: false, resultType: FlashCheckResultType.GenericError };
  }
}

/**
 * Disables flash encryption in SDK Configuration.
 */
export function disableFlashEncryption() {
  const newValueRequest = `{"version": 2, "set": { "SECURE_FLASH_ENC_ENABLED": false }}\n`;
  OutputChannel.appendLine(newValueRequest, "SDK Configuration Editor");
  ConfserverProcess.sendUpdatedValue(newValueRequest);
  ConfserverProcess.saveGuiConfigValues();
}
