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
import { Progress, ProgressLocation, Uri, window } from "vscode";
import { NotificationMode, readParameter, readSerialPort } from "../../configuration/idf";
import { spawn } from "../../utils";
import {
  getCurrentIdfConfiguration,
  getVirtualEnvPythonPath,
} from "../../configuration/env";
import { ensureDir } from "fs-extra";
import {
  isKnownError,
  missingDependency,
  noSerialPort,
  partitionInvalidSizeFormat,
  partitionReadFailed,
} from "../../common/error/knownError";

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
    async (_progress: Progress<{ message: string; increment: number }>) => {
      const modifiedEnv = getCurrentIdfConfiguration();
      const serialPort = await readSerialPort(workspaceFolder, false);
      if (!serialPort) {
        throw noSerialPort(modifiedEnv["IDF_TARGET"]);
      }
      const idfPath = modifiedEnv.IDF_PATH;
      const pythonBinPath = getVirtualEnvPythonPath();
      if (!pythonBinPath) {
        throw missingDependency("Python");
      }
      const esptoolPath = join(
        idfPath,
        "components",
        "esptool_py",
        "esptool",
        "esptool.py"
      );
      const resultBinaryPath = join(
        workspaceFolder.fsPath,
        "partitionsFromDevice",
        `${name}.bin`
      );

      await ensureDir(dirname(resultBinaryPath));

      const parsedSize = parsePartitionSize(size);

      try {
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
      } catch (error) {
        if (isKnownError(error)) {
          throw error;
        }
        const msg =
          error instanceof Error && error.message
            ? error.message
            : "Error reading partition from device to binary";
        throw partitionReadFailed(msg);
      }
      window.showInformationMessage(
        `Device partition @${offset} saved as ${resultBinaryPath}`
      );
    }
  );
}

export function parsePartitionSize(size: string): string {
  const regex = /^(\d+)([KM]?)$/i;
  const match = size.match(regex);

  if (!match) {
    throw partitionInvalidSizeFormat(size);
  }
  const value = parseInt(match[1], 10);
  const unit = match[2].toUpperCase();

  const multipliers: { [key: string]: number } = {
    K: 1024,
    M: 1024 ** 2,
    "": 1,
  };

  const bytes = value * (multipliers[unit] || 1);

  return "0x" + bytes.toString(16).toUpperCase();
}

export function formatAsPartitionSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return `${Math.ceil(mb)}M`;
  } else if (bytes >= 1024) {
    const kb = bytes / 1024;
    return `${Math.ceil(kb)}K`;
  } else {
    return bytes.toString();
  }
}
