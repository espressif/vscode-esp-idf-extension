/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 16th July 2021 4:23:24 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
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

import { join } from "path";
import { Uri } from "vscode";
import { readParameter, readSerialPort } from "../configuration/idf";
import { Logger } from "../common/logger";
import { getCurrentIdfConfiguration, getVirtualEnvPythonPath } from "../configuration/env";
import { pathExists } from "fs-extra";
import { createFlashModel } from "../flash/transports/uart/flashModelBuilder";
import { spawn } from "../utils";
import {
  esptoolNotAccessible,
  flasherArgsMissing,
  invalidConfiguration,
  isKnownError,
  known,
  missingDependency,
  noSerialPort,
} from "../common/error/knownError";
import { ErrorCode } from "../common/error/types";

let readSerialPortForTests:
  | ((workspaceFolder: Uri, allowPrompt: boolean) => Promise<string>)
  | undefined;

export function setReadSerialPortForTests(
  fn:
    | ((workspaceFolder: Uri, allowPrompt: boolean) => Promise<string>)
    | undefined
): void {
  readSerialPortForTests = fn;
}

async function loadSerialPort(workspaceFolder: Uri): Promise<string> {
  if (readSerialPortForTests) {
    return readSerialPortForTests(workspaceFolder, false);
  }
  return readSerialPort(workspaceFolder, false);
}

export async function verifyAppBinary(workspaceFolder: Uri): Promise<void> {
  const modifiedEnv = getCurrentIdfConfiguration();
  const serialPort = await loadSerialPort(workspaceFolder);
  if (!serialPort) {
    throw noSerialPort(modifiedEnv["IDF_TARGET"] || "default");
  }
  const flashBaudRate = readParameter("idf.flashBaudRate", workspaceFolder) as string;
  const pythonBinPath = getVirtualEnvPythonPath();
  if (!pythonBinPath) {
    throw missingDependency("Python");
  }
  const idfPath = modifiedEnv["IDF_PATH"];
  if (!idfPath) {
    throw esptoolNotAccessible();
  }
  const esptoolPath = join(
    idfPath,
    "components",
    "esptool_py",
    "esptool",
    "esptool.py"
  );
  if (!(await pathExists(esptoolPath))) {
    throw esptoolNotAccessible();
  }
  const buildDirPath = readParameter(
    "idf.buildPath",
    workspaceFolder
  ) as string;
  const flasherArgsJsonPath = join(buildDirPath, "flasher_args.json");
  if (!(await pathExists(flasherArgsJsonPath))) {
    throw flasherArgsMissing();
  }
  const model = await createFlashModel(
    flasherArgsJsonPath,
    serialPort,
    flashBaudRate
  );

  try {
    const cmdResult = await spawn(
      pythonBinPath,
      [
        esptoolPath,
        "-p",
        serialPort,
        "verify_flash",
        model.app.address,
        `build/${model.app.binFilePath}`,
      ],
      {
        cwd: workspaceFolder.fsPath,
        env: modifiedEnv,
      }
    );
    Logger.info(cmdResult.toString());
    const output = cmdResult.toString();
    if (output.indexOf("verify FAILED (digest mismatch)") !== -1) {
      throw invalidConfiguration("verifyAppBinBeforeDebug");
    }
    if (output.indexOf("verify OK (digest matched)") !== -1) {
      return;
    }
    throw known(ErrorCode.TaskFailedWithOutput, {
      detail: "Unexpected esptool verify_flash output",
    });
  } catch (error) {
    if (isKnownError(error)) {
      throw error;
    }
    if (
      error instanceof Error &&
      error.message.indexOf("verify FAILED (digest mismatch)") !== -1
    ) {
      throw invalidConfiguration("verifyAppBinBeforeDebug");
    }
    const msg =
      error instanceof Error && error.message
        ? error.message
        : "App binary verification failed.";
    throw known(ErrorCode.TaskFailedWithOutput, { detail: msg });
  }
}
