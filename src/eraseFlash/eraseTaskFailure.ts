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

import { ErrorCode, ErrorPresentation } from "../common/error/types";
import { isKnownError, known } from "../common/error/knownError";
import { throwCapturedTaskFailure } from "../taskManager/taskManager";
import type { CustomExecutionTaskResult } from "../taskManager/types";

const eraseTaskFailedWithOutputPresentation: ErrorPresentation = {
  userMessage:
    "Erase flash task failed. Check the terminal output for details.",
  logMessage: "Erase flash task failed with captured output.",
  outputChannel: "Erase flash",
};

export async function throwEraseCapturedTaskFailure(
  executions: CustomExecutionTaskResult["executions"]
): Promise<void> {
  try {
    await throwCapturedTaskFailure(executions);
  } catch (error) {
    if (
      isKnownError(error) &&
      error.code === ErrorCode.TaskFailedWithOutput
    ) {
      throw known(
        ErrorCode.TaskFailedWithOutput,
        error.metadata,
        eraseTaskFailedWithOutputPresentation
      );
    }
    throw error;
  }
}
