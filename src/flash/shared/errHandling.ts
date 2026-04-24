/*
 * Project: ESP-IDF VSCode Extension
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
import { ESP } from "../../config";
import { Logger } from "../../logger/logger";
import { OutputChannel } from "../../logger/outputChannel";

type FlashCommandErrorPresentation = {
  userMessage: string;
  loggerScope: string;
  notify: "error" | "info";
};

/** Task process exit code 74: no DFU-capable USB device (message text varies with task name). */
const FLASH_TASK_EXIT_CODE_74_PRESENTATION: FlashCommandErrorPresentation = {
  userMessage: "No DFU capable USB device available found",
  loggerScope: "flashCommand code 74 no dfu device found",
  notify: "error",
};

function readTaskProcessExitCode(error: unknown): number | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }
  const code = (error as { exitCode?: unknown }).exitCode;
  return typeof code === "number" ? code : undefined;
}

export function isFlashRelatedTaskExitCode74(
  error: unknown,
  errorMessage: string
): boolean {
  if (readTaskProcessExitCode(error) === 74) {
    return true;
  }
  return /exited with code 74$/.test(errorMessage);
}

const FLASH_COMMAND_ERRORS_BY_MESSAGE = new Map<
  string,
  FlashCommandErrorPresentation
>([
  [
    "NO_DFU_DEVICE_SELECTED",
    {
      userMessage: "No DFU was selected",
      loggerScope: "flashCommand no dfu selected",
      notify: "info",
    },
  ],
  [
    "FLASH_TERMINATED",
    {
      userMessage: "Flashing has been stopped!",
      loggerScope: "flashCommand flash terminated",
      notify: "error",
    },
  ],
  [
    "SECTION_BIN_FILE_NOT_ACCESSIBLE",
    {
      userMessage: "Flash (.bin) files don't exists or can't be accessed!",
      loggerScope: "flashCommand section bin file access error",
      notify: "error",
    },
  ],
]);

function presentMappedFlashCommandError(
  presentation: FlashCommandErrorPresentation,
  error: unknown
) {
  OutputChannel.appendLineAndShow(presentation.userMessage, "Flash");
  if (presentation.notify === "info") {
    Logger.infoNotify(presentation.userMessage);
  } else {
    Logger.errorNotify(
      presentation.userMessage,
      error as Error,
      presentation.loggerScope
    );
  }
}

// Returns false only for ALREADY_FLASHING (caller must not clear FlashSession).
export function handleFlashCommandCatch(
  error: unknown,
  flashType: ESP.FlashType
): boolean {
  const errMsg = error instanceof Error ? error.message : String(error);
  const category =
    flashType === ESP.FlashType.UART
      ? "uartFlashCommand"
      : flashType === ESP.FlashType.DFU
        ? "dfuFlashCommand"
        : flashType === ESP.FlashType.JTAG
          ? "jtagFlashCommand"
          : "flashCommand";

  if (errMsg === "ALREADY_FLASHING") {
    const errStr = "Already one flash process is running!";
    OutputChannel.appendLineAndShow(errStr, "Flash");
    Logger.errorNotify(errStr, error as Error, "flashCommand already flashing");
    return false;
  }

  if (isFlashRelatedTaskExitCode74(error, errMsg)) {
    presentMappedFlashCommandError(FLASH_TASK_EXIT_CODE_74_PRESENTATION, error);
    return true;
  }

  const mapped = FLASH_COMMAND_ERRORS_BY_MESSAGE.get(errMsg);
  if (mapped) {
    presentMappedFlashCommandError(mapped, error);
    return true;
  }

  const errnoCode =
    error && typeof error === "object" && "code" in error
      ? (error as { code?: string }).code
      : undefined;
  if (errnoCode === "ENOENT" || errMsg === "SCRIPT_PERMISSION_ERROR") {
    const errStr = `Make sure you have the esptool.py installed and set in $PATH with proper permission`;
    OutputChannel.appendLineAndShow(errStr, "Flash");
    Logger.errorNotify(
      errStr,
      error as Error,
      `${category} esptool.py access error`
    );
    return true;
  }

  const errStr = `Failed to flash because of some unusual error. Check Terminal for more details`;
  OutputChannel.appendLineAndShow(errStr, "Flash");
  Logger.errorNotify(errStr, error as Error, `${category} unknown error`);
  return true;
}
