/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 20th February 2025 11:05:27 am
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
import { dirname, join } from "path";
import { l10n, Progress, ProgressLocation, Uri, window } from "vscode";
import { NotificationMode, readParameter, readSerialPort } from "../../idfConfiguration";
import { Logger } from "../../logger/logger";
import { spawn } from "../../utils";
import { getVirtualEnvPythonPath } from "../../pythonManager";
import { ensureDir } from "fs-extra";
import { configureEnvVariables } from "../../common/prepareEnv";

export async function readPartition(
  name: string,
  offset: string,
  size: string,
  workspaceFolder: Uri
) {
  const notificationMode = readParameter(
    "idf.notificationMode",
    workspaceFolder
  ) as string;
  const progressLocation =
    notificationMode === NotificationMode.All ||
    notificationMode === NotificationMode.Notifications
      ? ProgressLocation.Notification
      : ProgressLocation.Window;
  await window.withProgress(
    {
      cancellable: false,
      location: progressLocation,
      title: "ESP-IDF: Reading partition from device to binary",
    },
    async (progress: Progress<{ message: string; increment: number }>) => {
      try {
        const modifiedEnv = await configureEnvVariables(this.config.workspaceFolder);
        const serialPort = await readSerialPort(workspaceFolder, false);
        if (!serialPort) {
          return Logger.warnNotify(
            l10n.t(
              "No serial port found for current IDF_TARGET: {0}",
              modifiedEnv["IDF_TARGET"]
            )
          );
        }
        const idfPath = modifiedEnv.IDF_PATH;
        const pythonBinPath = await getVirtualEnvPythonPath();
        const esptoolPath = join(
          idfPath,
          "components",
          "esptool_py",
          "esptool",
          "esptool.py"
        );
        let resultBinaryPath = join(
          workspaceFolder.fsPath,
          "partitionsFromDevice",
          `${name}.bin`
        );

        await ensureDir(dirname(resultBinaryPath));

        const parsedSize = parsePartitionSize(size);

        await spawn(
          pythonBinPath,
          [
            esptoolPath,
            "-p",
            serialPort,
            "read_flash",
            offset,
            parsedSize,
            resultBinaryPath,
          ],
          {
            cwd: workspaceFolder.fsPath,
            env: modifiedEnv,
          }
        );
        window.showInformationMessage(
          `Device partition @${offset} saved as ${resultBinaryPath}`
        );
      } catch (error) {
        let msg = error.message
          ? error.message
          : "Error reading partition from device to binary";
        Logger.errorNotify(msg, error, "readPartition");
      }
    }
  );
}

export function parsePartitionSize(size: string): string {
  // Regular expression to match the size pattern (e.g., 24K, 1M)
  const regex = /^(\d+)([KM]?)$/i;
  const match = size.match(regex);

  if (!match) {
    throw new Error("Invalid size format");
  }
  const value = parseInt(match[1], 10);
  const unit = match[2].toUpperCase();

  // Define the multiplier based on the unit
  const multipliers: { [key: string]: number } = {
    K: 1024,
    M: 1024 ** 2,
    "": 1, // No unit defaults to bytes
  };

  const bytes = value * (multipliers[unit] || 1);

  // Convert to hexadecimal string prefixed with '0x'
  return "0x" + bytes.toString(16).toUpperCase();
}

export function formatAsPartitionSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    // For megabytes, divide by (1024*1024) and remove any trailing zeros if not needed.
    const mb = bytes / (1024 * 1024);
    return `${Math.ceil(mb)}M`;
  } else if (bytes >= 1024) {
    const kb = bytes / 1024;
    return `${Math.ceil(kb)}K`;
  } else {
    return bytes.toString();
  }
}
