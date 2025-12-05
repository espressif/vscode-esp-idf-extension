/*
 * Project: ESP-IDF VSCode Extension
 * File Created: 12.02.2025
 * Copyright 2025 Espressif Systems (Shanghai) CO LTD
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

import * as vscode from "vscode";
import { ESP } from "../../config";
import { Logger } from "../../logger/logger";

/**
 * Key used to store the OpenOCD USB adapter serial number in workspace state
 */
const OPENOCD_ADAPTER_SERIAL_KEY = "openocd.usbAdapterSerial";

/**
 * Regular expression to match OpenOCD log line with USB adapter serial number
 * Format: "Info : esp_usb_jtag: serial (30:ED:A0:E4:22:94)"
 * The serial number is in the format of MAC address: XX:XX:XX:XX:XX:XX
 */
const SERIAL_NUMBER_REGEX = /Info\s*:\s*esp_usb_jtag:\s*serial\s*\(([0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){5})\)/;

/**
 * Parses OpenOCD log output to extract USB adapter serial number
 * @param logOutput The log output from OpenOCD (can be a string or Buffer)
 * @returns The serial number if found, undefined otherwise
 */
export function parseAdapterSerialFromLog(
  logOutput: string | Buffer
): string | undefined {
  const logString = typeof logOutput === "string" ? logOutput : logOutput.toString();
  const match = logString.match(SERIAL_NUMBER_REGEX);
  if (match && match[1]) {
    return match[1];
  }
  return undefined;
}

/**
 * Stores the OpenOCD USB adapter serial number in workspace state
 * @param workspaceFolder The workspace folder URI
 * @param serialNumber The serial number to store
 */
export function storeAdapterSerial(
  workspaceFolder: vscode.Uri,
  serialNumber: string
): void {
  try {
    if (ESP.ProjectConfiguration.store) {
      ESP.ProjectConfiguration.store.set(OPENOCD_ADAPTER_SERIAL_KEY, serialNumber);
      Logger.info(
        `Stored OpenOCD USB adapter serial number: ${serialNumber} for workspace ${workspaceFolder.fsPath}`
      );
    }
  } catch (error) {
    Logger.error(
      `Failed to store OpenOCD USB adapter serial number`,
      error,
      "storeAdapterSerial"
    );
  }
}

/**
 * Retrieves the stored OpenOCD USB adapter serial number from workspace state
 * @param workspaceFolder The workspace folder URI
 * @returns The serial number if found, undefined otherwise
 */
export function getStoredAdapterSerial(
  workspaceFolder: vscode.Uri
): string | undefined {
  try {
    if (ESP.ProjectConfiguration.store) {
      return ESP.ProjectConfiguration.store.get<string>(OPENOCD_ADAPTER_SERIAL_KEY);
    }
  } catch (error) {
    Logger.error(
      `Failed to retrieve OpenOCD USB adapter serial number`,
      error,
      "getStoredAdapterSerial"
    );
  }
  return undefined;
}

/**
 * Clears the stored OpenOCD USB adapter serial number from workspace state
 * @param workspaceFolder The workspace folder URI
 */
export function clearAdapterSerial(
  workspaceFolder: vscode.Uri
): void {
  try {
    if (ESP.ProjectConfiguration.store) {
      ESP.ProjectConfiguration.store.clear(OPENOCD_ADAPTER_SERIAL_KEY);
      Logger.info(
        `Cleared OpenOCD USB adapter serial number for workspace ${workspaceFolder.fsPath}`
      );
    }
  } catch (error) {
    Logger.error(
      `Failed to clear OpenOCD USB adapter serial number`,
      error,
      "clearAdapterSerial"
    );
  }
}

/**
 * Gets the OpenOCD USB adapter identifier to use, preferring serial number over location
 * @param workspaceFolder The workspace folder URI
 * @param customExtraVars Custom extra variables that may contain OPENOCD_USB_ADAPTER_LOCATION
 * @returns The adapter serial number if available, otherwise the location, or undefined
 */
export function getOpenOcdAdapterIdentifier(
  workspaceFolder: vscode.Uri,
  customExtraVars?: { [key: string]: string }
): string | undefined {
  // First, try to get the stored serial number
  const serialNumber = getStoredAdapterSerial(workspaceFolder);
  if (serialNumber) {
    return serialNumber;
  }

  // Fallback to OPENOCD_USB_ADAPTER_LOCATION if available
  if (customExtraVars && customExtraVars["OPENOCD_USB_ADAPTER_LOCATION"]) {
    return customExtraVars["OPENOCD_USB_ADAPTER_LOCATION"];
  }

  return undefined;
}

