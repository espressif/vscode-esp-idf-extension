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

    const idfTarget = idfConf.readParameter(
      "idf.adapterTargetName",
      workspaceRoot
    );
    const eFuse = new ESPEFuseManager(workspaceRoot);
    const data = await eFuse.readSummary();

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

/**
 * Determines the status of JTAG based on eFuse summary data and provides a detailed result.
 * @param {Object} eFuseSummary - The eFuse summary object containing various configuration fields, including JTAG-related ones.
 * @returns {Object} An object with the following properties:
 *    - {boolean} disabled: Indicates whether JTAG is permanently or temporarily disabled.
 *    - {string} message: A descriptive message explaining the JTAG status or the conditions that may affect it.
 *    - {boolean} requiresVerification: Indicates if additional verification is recommended (e.g., due to configurable strapping options).
 */
export function isJtagDisabled(
  eFuseSummary: any
): { disabled: boolean; message: string; requiresVerification: boolean } {
  if (eFuseSummary.DIS_PAD_JTAG && eFuseSummary.DIS_PAD_JTAG.value === true) {
    return {
      disabled: true,
      message: vscode.l10n.t(
        "JTAG is permanently disabled in hardware (DIS_PAD_JTAG is set)."
      ),
      requiresVerification: false,
    };
  }

  if (eFuseSummary.DIS_USB_JTAG && eFuseSummary.DIS_USB_JTAG.value === true) {
    return {
      disabled: true,
      message: vscode.l10n.t(
        "USB-to-JTAG functionality is disabled (DIS_USB_JTAG is set)."
      ),
      requiresVerification: false,
    };
  }

  if (
    eFuseSummary.SOFT_DIS_JTAG &&
    typeof eFuseSummary.SOFT_DIS_JTAG.value === "number" &&
    eFuseSummary.SOFT_DIS_JTAG.value % 2 === 1
  ) {
    return {
      disabled: true,
      message: vscode.l10n.t(
        "JTAG is soft-disabled (SOFT_DIS_JTAG is set to an odd value: {0}).",
        eFuseSummary.SOFT_DIS_JTAG.value.toString()
      ),
      requiresVerification: false,
    };
  }

  if (
    eFuseSummary.STRAP_JTAG_SEL &&
    eFuseSummary.STRAP_JTAG_SEL.value === true
  ) {
    return {
      disabled: false,
      message: vscode.l10n.t(
        "JTAG selection may be affected by strapping configuration (STRAP_JTAG_SEL is set)."
      ),
      requiresVerification: true,
    };
  }

  return {
    disabled: false,
    message: vscode.l10n.t("JTAG is not disabled."),
    requiresVerification: false,
  };
}
