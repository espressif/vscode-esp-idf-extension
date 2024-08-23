/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 30th April 2021 10:25:57 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { pathExists } from "fs-extra";
import { join } from "path";
import * as idfConf from "../idfConfiguration";
import * as vscode from "vscode";
import { FlashTask } from "./flashTask";
import { BuildTask } from "../build/buildTask";
import { Logger } from "../logger/logger";
import { getProjectName } from "../workspaceConfig";
import { getDfuList } from "./dfu";
import { ESP } from "../config";
import { OutputChannel } from "../logger/outputChannel";
import * as utils from "../utils";
import {
  showInfoNotificationWithLink,
  showQuickPickWithCustomActions,
} from "../logger/utils";
import { ConfserverProcess } from "../espIdf/menuconfig/confServerProcess";
import { ESPEFuseManager } from "../efuse";
import { getDocsUrl } from "../espIdf/documentation/getDocsVersion";

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

export async function verifyCanFlash(
  flashBaudRate: string,
  port: string,
  workspace: vscode.Uri
) {
  let continueFlag = true;
  if (BuildTask.isBuilding || FlashTask.isFlashing) {
    const waitProcessIsFinishedMsg = vscode.l10n.t(
      "Wait for ESP-IDF task to finish"
    );
    OutputChannel.show();
    OutputChannel.appendLineAndShow(waitProcessIsFinishedMsg, "Flash");
    return Logger.errorNotify(
      waitProcessIsFinishedMsg,
      new Error("One_Task_At_A_Time"),
      "flashCmd verifyCanFlash already build flash task running"
    );
  }

  const buildPath = idfConf.readParameter("idf.buildPath", workspace) as string;
  if (!(await pathExists(buildPath))) {
    const errStr = `Build is required before Flashing, ${buildPath} can't be accessed`;
    OutputChannel.show();
    OutputChannel.appendLineAndShow(errStr, "Flash");
    return Logger.errorNotify(errStr, new Error("BUILD_PATH_ACCESS_ERROR"),
    "flashCmd verifyCanFlash build path doesnt exist");
  }
  if (!(await pathExists(join(buildPath, "flasher_args.json")))) {
    const errStr =
      "flasher_args.json file is missing from the build directory, can't proceed, please build properly!";
    OutputChannel.show();
    OutputChannel.appendLineAndShow(errStr, "Flash");
    return Logger.warnNotify(errStr);
  }
  const projectName = await getProjectName(buildPath);
  if (!(await pathExists(join(buildPath, `${projectName}.elf`)))) {
    const errStr = `Can't proceed with flashing, since project elf file (${projectName}.elf) is missing from the build dir. (${buildPath})`;
    OutputChannel.show();
    OutputChannel.appendLineAndShow(errStr, "Flash");
    return Logger.warnNotify(errStr);
  }
  if (!port) {
    try {
      await vscode.commands.executeCommand("espIdf.selectPort");
    } catch (error) {
      const errStr = "Unable to execute the command: espIdf.selectPort";
      OutputChannel.show();
      OutputChannel.appendLineAndShow(errStr, "Flash");
      Logger.error(errStr, error, "verifyCanFlash selectPort");
    }
    const errStr = "Select a port before flashing";
    OutputChannel.show();
    OutputChannel.appendLineAndShow(errStr, "Flash");
    return Logger.errorNotify(errStr, new Error("NOT_SELECTED_PORT"),
    "flashCmd verifyCanFlash select port");
  }
  if (!flashBaudRate) {
    const errStr = "Select a baud rate before flashing";
    OutputChannel.show();
    OutputChannel.appendLineAndShow(errStr, "Flash");
    return Logger.errorNotify(errStr, new Error("NOT_SELECTED_BAUD_RATE"),
    "flashCmd verifyCanFlash no flashbaudrate");
  }
  const selectedFlashType = idfConf.readParameter(
    "idf.flashType",
    workspace
  ) as ESP.FlashType;
  if (selectedFlashType === ESP.FlashType.DFU) {
    const listDfu = await getDfuList(workspace);
    if (!listDfu) {
      const errStr = "No DFU capable USB device available found";
      OutputChannel.show();
      OutputChannel.appendLineAndShow(errStr, "Flash");
      return Logger.errorNotify(errStr, new Error("NO_DFU_DEVICES_FOUND"),
      "flashCmd verifyCanFlash no dfu device found");
    }
  }
  return continueFlag;
}

export function isFlashEncryptionEnabled(workspaceRoot: vscode.Uri) {
  const flashEncryption = utils.getConfigValueFromSDKConfig(
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
      Logger.errorNotify(errorMessage, error, { tag: "Flash Encryption" });
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
      Logger.errorNotify(errorMessage, error, { tag: "Flash Encryption" });

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
    Logger.errorNotify(error.message, error, { tag: "Flash Encryption" });
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

  if (eFuseSummary.STRAP_JTAG_SEL && eFuseSummary.STRAP_JTAG_SEL.value === true) {
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