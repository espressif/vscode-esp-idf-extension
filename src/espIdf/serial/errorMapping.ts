/*
 * Project: ESP-IDF VSCode Extension
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

import { commands } from "vscode";
import { ErrorSeverity } from "../../common/customNotifications";
import { CommandErrorMapping, ErrorCode } from "../../common/error/types";

const serialOutputChannel = "Serial port";

const detectSerialPortAction = {
  label: "Detect",
  execute: () => commands.executeCommand("espIdf.detectSerialPort"),
};

export const serialCommandErrorMapping: CommandErrorMapping = {
  [ErrorCode.NoSerialPort]: {
    severity: ErrorSeverity.Warning,
    userMessage: "No serial port found for current IDF_TARGET: {idfTarget}",
    logMessage: "No serial port found for IDF_TARGET {idfTarget}.",
    actions: [detectSerialPortAction],
    outputChannel: serialOutputChannel,
  },
  [ErrorCode.NoSerialPortsAvailable]: {
    severity: ErrorSeverity.Warning,
    userMessage: "No serial ports found.",
    logMessage: "No serial ports found on this system.",
    actions: [detectSerialPortAction],
    outputChannel: serialOutputChannel,
  },
  [ErrorCode.EsptoolNotAccessible]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "Make sure you have the esptool.py installed and set in $PATH with proper permission",
    logMessage: "esptool.py is missing or not accessible.",
    actions: [],
    outputChannel: serialOutputChannel,
  },
  [ErrorCode.MISSING_DEPENDENCY]: {
    severity: ErrorSeverity.Error,
    userMessage: "Required dependency {dependency} is missing.",
    logMessage: "Missing dependency: {dependency}.",
    actions: [],
    outputChannel: serialOutputChannel,
  },
};
