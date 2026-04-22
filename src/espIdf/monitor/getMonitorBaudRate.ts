/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 21st April 2026 4:07:20 pm
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

import { Uri } from "vscode";
import { readParameter } from "../../idfConfiguration";
import { getConfigValueFromSDKConfig } from "../../utils";
import { Logger } from "../../logger/logger";

export async function getMonitorBaudRate(workspacePath: Uri) {
  let sdkMonitorBaudRate = "";
  try {
    sdkMonitorBaudRate = readParameter(
      "idf.monitorBaudRate",
      workspacePath
    ) as string;
    if (!sdkMonitorBaudRate) {
      sdkMonitorBaudRate = await getConfigValueFromSDKConfig(
        "CONFIG_ESP_CONSOLE_UART_BAUDRATE",
        workspacePath
      );
    }
  } catch (error) {
    const errMsg =
      error instanceof Error
        ? error.message
        : "ERROR reading CONFIG_ESP_CONSOLE_UART_BAUDRATE from sdkconfig";
    Logger.error(errMsg, error as Error, "src utils getMonitorBaudRate");
  }
  return sdkMonitorBaudRate;
}
