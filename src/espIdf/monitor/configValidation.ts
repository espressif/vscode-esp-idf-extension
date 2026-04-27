/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 21st April 2026 5:35:52 pm
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

import { l10n } from "vscode";
import { Logger } from "../../logger/logger";
import { LoadMonitorLaunchConfigResult } from "./launchConfig";

function isMonitorLaunchConfigFailure(
  result: LoadMonitorLaunchConfigResult
): result is Extract<LoadMonitorLaunchConfigResult, { ok: false }> {
  return result.ok === false;
}

export function logInvalidConfigReason(result: LoadMonitorLaunchConfigResult) {
  if (!isMonitorLaunchConfigFailure(result)) {
    return;
  }
  const { reason, detail } = result;
  switch (reason) {
    case "one_task_at_time": {
      const waitProcessIsFinishedMsg = l10n.t("Wait for ESP-IDF task to finish");
      Logger.errorNotify(
        waitProcessIsFinishedMsg,
        new Error("One_Task_At_A_Time"),
        "monitor configValidation one_task_at_time"
      );
      return;
    }
    case "no_port":
      Logger.errorNotify(
        "Select a serial port before flashing",
        new Error("NOT_SELECTED_PORT"),
        "monitor configValidation no_port"
      );
      return;
    case "no_python":
      Logger.errorNotify(
        "Python binary path is not defined",
        new Error("Virtual environment Python path is not defined"),
        "monitor configValidation no_python"
      );
      return;
    case "no_idf_path":
      Logger.errorNotify(
        l10n.t("IDF_PATH is not set for this workspace."),
        new Error("IDF_PATH not set"),
        "monitor configValidation no_idf_path"
      );
      return;
    case "idf_version_error":
      Logger.errorNotify(
        l10n.t("Failed to read ESP-IDF version from IDF_PATH"),
        new Error(detail ?? "idf version error"),
        "monitor configValidation idf_version_error"
      );
      return;
    case "no_idf_target":
      Logger.infoNotify("IDF_TARGET is not defined.", {
        category: "monitor configValidation no_idf_target",
      });
      return;
    case "no_idf_monitor": {
      const pathMsg = detail
        ? `${detail} is not defined`
        : "idf_monitor.py is not defined";
      Logger.errorNotify(
        pathMsg,
        new Error(pathMsg),
        "monitor configValidation no_idf_monitor"
      );
      return;
    }
    case "elf_path_error":
      Logger.errorNotify(
        l10n.t("Failed to get project ELF file path"),
        new Error(detail ?? "ELF path error"),
        "monitor configValidation elf_path_error"
      );
      return;
    default: {
      const unexpectedReason: never = reason;
      Logger.errorNotify(
        l10n.t("Unexpected monitor launch failure reason"),
        new Error(String(unexpectedReason)),
        "monitor configValidation unexpected_reason"
      );
      return;
    }
  }
}
