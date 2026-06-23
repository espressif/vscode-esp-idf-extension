import { NotificationMode, readParameter, writeParameter} from "../../configuration/idf";
import { Logger } from "../../common/logger";
import { OutputChannel } from "../../common/outputChannel";
import { ESP } from "../../config";
import {
  showInfoNotificationWithLink,
  showQuickPickWithCustomActions,
} from "../../common/customNotifications";
import { ConfserverProcess } from "../../espIdf/menuconfig/confserver/confServerProcess";
import { ESPEFuseManager, ESPEFuseSummary } from "../../efuse/manager";
import { getDocsUrl } from "../../espIdf/documentation/getDocsVersion";
import { getConfigValueFromSDKConfig, getIdfTargetFromSdkconfig } from "../../configuration/workspace";
import { CancellationToken, ConfigurationTarget, l10n, Progress, ProgressLocation, Uri, window } from "vscode";
import { getConfigValueFromBuild } from "../../utils";

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

export async function isFlashEncryptionEnabled(workspaceRoot: Uri) {
  const flashEncryption = await getConfigValueFromSDKConfig(
    "CONFIG_FLASH_ENCRYPTION_ENABLED",
    workspaceRoot
  );
  return flashEncryption === "y";
}

async function getEncryptionMode(workspaceRoot: Uri): Promise<string> {
  const releaseMode = await getConfigValueFromSDKConfig(
    "CONFIG_SECURE_FLASH_ENCRYPTION_MODE_RELEASE",
    workspaceRoot
  );
  return releaseMode === "y"
    ? l10n.t("Release Mode")
    : l10n.t("Development Mode");
}

export async function checkFlashEncryption(
  flashType: ESP.FlashType,
  workspaceFolderUri: Uri
): Promise<FlashCheckResult> {
  Logger.info(`Using flash type: ${flashType}`, { tag: "Flash" });

  try {
    if (flashType !== ESP.FlashType.UART) {
      const errorMessage = l10n.t(
        "Invalid flash type for partition encryption. Required: UART, Found: {0}. \n Choose one of the actions presented in the top center quick pick menu and re-flash.",
        flashType
      );
      const error = new Error(errorMessage);
      const customButtons = [
        {
          label: l10n.t("Change flash type to UART"),
          action: () => {
            writeParameter(
              "idf.flashType",
              "UART",
              ConfigurationTarget.WorkspaceFolder,
              workspaceFolderUri
            );
            const saveMessage = l10n.t(
              "Flashing method successfully changed to UART"
            );
            Logger.infoNotify(saveMessage);
            OutputChannel.appendLineAndShow(saveMessage, "Flash Encryption");
          },
        },
        {
          label: l10n.t("Disable Flash Encryption"),
          action: () => {
            disableFlashEncryption();
            const saveMessage = l10n.t(
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
        l10n.t("Pick one of the following actions to continue"),
        customButtons
      );
      return {
        success: false,
        resultType: FlashCheckResultType.ErrorInvalidFlashType,
      };
    }

    const valueEncryptionEnabled = await getConfigValueFromBuild(
      "SECURE_FLASH_ENC_ENABLED",
      workspaceFolderUri
    );
    if (!valueEncryptionEnabled) {
      const errorMessage = l10n.t(
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

    const idfTarget = await getIdfTargetFromSdkconfig(workspaceFolderUri);
    const eFuse = new ESPEFuseManager(workspaceFolderUri);

    const notificationMode = readParameter(
      "idf.notificationMode",
      workspaceFolderUri
    ) as string;
    const progressLocation =
      notificationMode === NotificationMode.All ||
      notificationMode === NotificationMode.Notifications
        ? ProgressLocation.Notification
        : ProgressLocation.Window;
    const data = await window.withProgress<{ [key: string]: any }>(
      {
        cancellable: true,
        location: progressLocation,
        title: l10n.t("ESP-IDF: Checking encryption eFuse..."),
      },
      async (
        progress: Progress<{
          message?: string;
          increment?: number;
        }>,
        cancelToken: CancellationToken
      ) => {
        return new Promise(async (resolve, reject) => {
          // Register cancellation handler
          cancelToken.onCancellationRequested(() => {
            Logger.info(l10n.t("eFuse check cancelled by user"), {
              tag: "Flash Encryption",
            });
            reject(new Error("Operation cancelled by user"));
          });

          try {
            // Start the eFuse reading operation
            progress.report({
              message: l10n.t("Reading eFuse data..."),
            });
            const summary = await eFuse.readSummary();

            if (cancelToken.isCancellationRequested) {
              reject(new Error("Operation cancelled by user"));
              return;
            }

            resolve(summary);
          } catch (error) {
            Logger.errorNotify(
              l10n.t("Failed to read eFuse summary"),
              error as Error,
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

    const encryptionMode = await getEncryptionMode(workspaceFolderUri);

    if (data && data[fieldEncription]) {
      if (
        // eFuse is not set
        data[fieldEncription] &&
        (data[fieldEncription].value === 0 ||
          data[fieldEncription].value == "Disable")
      ) {
        const documentationUrl = await getDocsUrl(
          ESP.URL.Docs.FLASH_ENCRYPTION,
          workspaceFolderUri
        );

        Logger.info(
          l10n.t("Flash encryption mode detected: {0}", encryptionMode),
          { tag: "Flash Encryption" }
        );

        const warningMessage =
          l10n.t("WARNING: Flash Encryption in {0}", encryptionMode) +
          "\n\n" +
          l10n.t(
            "This will burn eFuses on your device which is an IRREVERSIBLE operation."
          ) +
          "\n\n" +
          l10n.t("In {0}:", encryptionMode) +
          "\n" +
          (encryptionMode === l10n.t("Development Mode")
            ? l10n.t(
                "Development Mode: Allows re-flashing with plaintext data"
              )
            : l10n.t(
                "Release Mode: Permanently disables plaintext flashing"
              )) +
          "\n\n" +
          l10n.t(
            'The flash encryption process requires two steps:\n1. First, you need to confirm by typing "{0}" in the input box at the top of the screen\n2. After flashing completes, you MUST reset your device\n3. Then flash again to enable encryption',
            encryptionMode === l10n.t("Development Mode")
              ? "BURN DEV"
              : "BURN RELEASE"
          );

        OutputChannel.appendLineAndShow(warningMessage, "Flash Encryption");

        const confirmMessage = l10n.t(
          'Type "{0}" to confirm flash encryption (this is irreversible)',
          encryptionMode === l10n.t("Development Mode")
            ? "BURN DEV"
            : "BURN RELEASE"
        );
        const userInput = await window.showInputBox({
          prompt: confirmMessage,
          placeHolder:
            encryptionMode === l10n.t("Development Mode")
              ? "BURN DEV"
              : "BURN RELEASE",
          ignoreFocusOut: true,
          validateInput: (value: string) => {
            const expectedValue =
              encryptionMode === l10n.t("Development Mode")
                ? "BURN DEV"
                : "BURN RELEASE";
            if (value === expectedValue) {
              return null; // Input is valid
            }
            return l10n.t(
              'Please type "{0}" exactly to confirm',
              expectedValue
            );
          },
        });

        const expectedValue =
          encryptionMode === l10n.t("Development Mode")
            ? "BURN DEV"
            : "BURN RELEASE";
        if (userInput !== expectedValue) {
          const cancelMessage = l10n.t(
            "Flash encryption cancelled by user"
          );
          Logger.info(cancelMessage, { tag: "Flash Encryption" });
          OutputChannel.appendLineAndShow(cancelMessage, "Flash Encryption");
          return {
            success: false,
            resultType: FlashCheckResultType.GenericError,
          };
        }

        const continueMessage = l10n.t(
          "User confirmed flash encryption. Proceeding with two-step flashing process."
        );
        Logger.info(continueMessage, { tag: "Flash Encryption" });
        OutputChannel.appendLineAndShow(continueMessage, "Flash Encryption");

        const infoMessage = l10n.t(
          "Proceeding with flash encryption. Remember to reset your device after the first flash."
        );
        showInfoNotificationWithLink(infoMessage, documentationUrl);
        OutputChannel.appendLineAndShow(infoMessage, "Flash Encryption");
        Logger.info(infoMessage, { tag: "Flash Encryption" });
        return {
          success: false,
          resultType: FlashCheckResultType.ErrorEfuseNotSet,
        };
      }
      // eFuse is set - check if trying to switch from development to release mode
      else if (encryptionMode === l10n.t("Release Mode")) {
        const disDownloadManualEncrypt = data["DIS_DOWNLOAD_MANUAL_ENCRYPT"];
        if (disDownloadManualEncrypt && !disDownloadManualEncrypt.value) {
          const warningMessage = l10n.t(
            "WARNING: You are attempting to switch from Development Mode to Release Mode.\n\n" +
              "This is an irreversible operation that will permanently disable plaintext flashing.\n" +
              "Make sure you have a backup of your encryption key and understand the implications.\n\n" +
              "Type 'SWITCH' to confirm this operation."
          );
          OutputChannel.appendLineAndShow(warningMessage, "Flash Encryption");

          const userInput = await window.showInputBox({
            prompt: l10n.t(
              "Type 'SWITCH' to confirm switching to Release Mode"
            ),
            placeHolder: "SWITCH",
            ignoreFocusOut: true,
            validateInput: (value: string) => {
              if (value === "SWITCH") {
                return null; // Input is valid
              }
              return l10n.t("Please type 'SWITCH' exactly to confirm");
            },
          });

          if (userInput !== "SWITCH") {
            const cancelMessage = l10n.t(
              "Switching to Release Mode cancelled by user"
            );
            Logger.info(cancelMessage, { tag: "Flash Encryption" });
            OutputChannel.appendLineAndShow(cancelMessage, "Flash Encryption");
            return {
              success: false,
              resultType: FlashCheckResultType.GenericError,
            };
          }

          const continueMessage = l10n.t(
            "User confirmed switching to Release Mode. Proceeding with flash encryption."
          );
          Logger.info(continueMessage, { tag: "Flash Encryption" });
          OutputChannel.appendLineAndShow(continueMessage, "Flash Encryption");
        }
      }
      // eFuse is set and no mode switch needed
      return { success: true };
    } else {
      const errorMessage = l10n.t(
        "Could not find Encryption Key for {0}",
        idfTarget
      );
      OutputChannel.appendLineAndShow(errorMessage, "Flash Encryption");
      Logger.error(
        errorMessage,
        new Error(errorMessage),
        "verifyFlashEncryption missing encryption key",
        { tag: "Flash Encryption" }
      );
      return {
        success: false,
        resultType: FlashCheckResultType.ErrorEfuseNotSet,
      };
    }
  } catch (error) {
    const errMsg = error instanceof Error && error.message ? error.message : "Unknown error";
    if (errMsg === "Operation cancelled by user") {
      const cancelMessage = l10n.t("eFuse check cancelled by user");
      Logger.info(cancelMessage, { tag: "Flash Encryption" });
      OutputChannel.appendLineAndShow(cancelMessage, "Flash Encryption");
      return {
        success: false,
        resultType: FlashCheckResultType.GenericError,
      };
    }

    const errorMessage = l10n.t(
      "Error during flash encryption check: {0}",
      errMsg
    );
    OutputChannel.appendLineAndShow(errorMessage, "Flash Encryption");
    Logger.errorNotify(
      errorMessage,
      error as Error,
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
