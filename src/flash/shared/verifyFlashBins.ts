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

import { constants } from "fs";
import { join } from "path";
import { canAccessFile } from "../../utils";
import { FlashModel } from "../transports/uart/types/flashModel";

export function assertFlashSectionsReadable(
  buildDirPath: string,
  model: FlashModel
): void {
  for (const flashFile of model.flashSections) {
    if (
      !canAccessFile(
        join(buildDirPath, flashFile.binFilePath),
        constants.R_OK
      )
    ) {
      throw new Error("SECTION_BIN_FILE_NOT_ACCESSIBLE");
    }
  }
}
