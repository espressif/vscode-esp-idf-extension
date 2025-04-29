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

async function getEncryptionMode(workspaceRoot: vscode.Uri): Promise<string> {
  const releaseMode = await utils.getConfigValueFromSDKConfig(
    "CONFIG_SECURE_FLASH_ENCRYPTION_MODE_RELEASE",
    workspaceRoot
  );
  return releaseMode === "y" ? vscode.l10n.t("Release Mode") : vscode.l10n.t("Development Mode");
}

export async function checkFlashEncryption(
  flashType: ESP.FlashType,
  workspaceRoot: vscode.Uri
): Promise<FlashCheckResult> {
  Logger.info(`Using flash type: ${flashType}`, { tag: "Flash" });

  try {
    if (flashType !== ESP.FlashType.UART) {
      const errorMessage = vscode.l10n.t(
        "Invalid flash type for partition encryption. Required: UART, Found: {0}. \n Choose one of the actions presented in the top center quick pick menu and re-flash.",
        flashType
      );
      const error = new Error(errorMessage);
      const customButtons = [
        {
          label: vscode.l10n.t("Change flash type to UART"),
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
          label: vscode.l10n.t("Disable Flash Encryption"),
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
        vscode.l10n.t("Pick one of the following actions to continue"),
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
      const errorMessage = vscode.l10n.t(
        "Flash encryption is enabled in the SDK configuration, but the project has not been rebuilt with these settings. Please rebuild the project to apply the encryption settings before attempting to flash the device."
      );
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
        title: vscode.l10n.t("ESP-IDF: Checking encryption eFuse..."),
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
            Logger.info(vscode.l10n.t("eFuse check cancelled by user"), {
              tag: "Flash Encryption",
            });
            reject(new Error("Operation cancelled by user"));
          });

          try {
            // Start the eFuse reading operation
            progress.report({ message: vscode.l10n.t("Reading eFuse data...") });
            const summary = await eFuse.readSummary();

            if (cancelToken.isCancellationRequested) {
              reject(new Error("Operation cancelled by user"));
              return;
            }

            resolve(summary);
          } catch (error) {
            Logger.errorNotify(
              vscode.l10n.t("Failed to read eFuse summary"),
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
        const encryptionMode = await getEncryptionMode(workspaceRoot);
        const documentationUrl = await getDocsUrl(
          ESP.URL.Docs.FLASH_ENCRYPTION,
          workspaceRoot
        );
        
        // Log the encryption mode being used
        Logger.info(vscode.l10n.t("Flash encryption mode detected: {0}", encryptionMode), { tag: "Flash Encryption" });
        
        const warningMessage = vscode.l10n.t("WARNING: Flash Encryption in {0}", encryptionMode) + "\n\n" +
          vscode.l10n.t("This will burn eFuses on your device which is an IRREVERSIBLE operation.") + "\n\n" +
          vscode.l10n.t("In {0}:", encryptionMode) + "\n" +
          (encryptionMode === vscode.l10n.t("Development Mode") 
            ? vscode.l10n.t("Development Mode: Allows re-flashing with plaintext data")
            : vscode.l10n.t("Release Mode: Permanently disables plaintext flashing")) + "\n\n" +
          vscode.l10n.t("You will need to complete a two-step flashing process:\n1. First flash without encryption\n2. Reset your device\n3. Second flash with encryption");

        // Log the warning to output channel
        OutputChannel.appendLineAndShow(warningMessage, "Flash Encryption");
        
        // Show warning message with input box
        const confirmMessage = vscode.l10n.t('Type "BURN" to confirm flash encryption (this is irreversible)');
        const userInput = await vscode.window.showInputBox({
          prompt: confirmMessage,
          placeHolder: "BURN",
          ignoreFocusOut: true,
          validateInput: (value: string) => {
            if (value === "BURN") {
              return null; // Input is valid
            }
            return vscode.l10n.t('Please type "BURN" exactly to confirm');
          }
        });

        if (userInput !== "BURN") {
          const cancelMessage = vscode.l10n.t("Flash encryption cancelled by user");
          Logger.info(cancelMessage, { tag: "Flash Encryption" });
          OutputChannel.appendLineAndShow(cancelMessage, "Flash Encryption");
          return {
            success: false,
            resultType: FlashCheckResultType.GenericError,
          };
        }

        // Log the continuation
        const continueMessage = vscode.l10n.t("User confirmed flash encryption. Proceeding with two-step flashing process.");
        Logger.info(continueMessage, { tag: "Flash Encryption" });
        OutputChannel.appendLineAndShow(continueMessage, "Flash Encryption");

        const infoMessage = vscode.l10n.t("Proceeding with flash encryption. Remember to reset your device after the first flash.");
        showInfoNotificationWithLink(infoMessage, documentationUrl);
        OutputChannel.appendLineAndShow(infoMessage, "Flash Encryption");
        Logger.info(infoMessage, { tag: "Flash Encryption" });
        return {
          success: false,
          resultType: FlashCheckResultType.ErrorEfuseNotSet,
        };
      }
      // eFuse is set
      return { success: true };
    } else {
      const errorMessage = vscode.l10n.t("Could not find Encryption Key for {0}", idfTarget);
      OutputChannel.appendLineAndShow(errorMessage, "Flash Encryption");
      Logger.error(errorMessage, new Error(errorMessage), "verifyFlashEncryption missing encryption key", { tag: "Flash Encryption" });
      return {
        success: false,
        resultType: FlashCheckResultType.ErrorEfuseNotSet,
      };
    }
  } catch (error) {
    if (error.message === "Operation cancelled by user") {
      const cancelMessage = vscode.l10n.t("eFuse check cancelled by user");
      Logger.info(cancelMessage, { tag: "Flash Encryption" });
      OutputChannel.appendLineAndShow(cancelMessage, "Flash Encryption");
      return {
        success: false,
        resultType: FlashCheckResultType.GenericError,
      };
    }

    const errorMessage = vscode.l10n.t("Error during flash encryption check: {0}", error.message);
    OutputChannel.appendLineAndShow(errorMessage, "Flash Encryption");
    Logger.errorNotify(
      errorMessage,
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
