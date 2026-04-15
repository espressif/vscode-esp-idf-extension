/*
 * Project: ESP-IDF VSCode Extension
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

import { PreCheck } from "../../../common/PreCheck";
import { OpenOCDManager } from "../../../espIdf/openOcd/openOcdManager";
import { Logger } from "../../../logger/logger";

/** Minimum OpenOCD build required for JTAG flash and JTAG erase in this extension. */
export const MIN_OPENOCD_VERSION_FOR_JTAG = "v0.10.0-esp32-20201125";

export async function assertMinimumOpenOcdVersionForJtag(): Promise<boolean> {
  const openOCDManager = OpenOCDManager.init();
  const currentVersion = await openOCDManager.version();
  const ok = PreCheck.openOCDVersionValidator(
    MIN_OPENOCD_VERSION_FOR_JTAG,
    currentVersion
  );
  if (!ok) {
    Logger.infoNotify(
      `Minimum OpenOCD version ${MIN_OPENOCD_VERSION_FOR_JTAG} is required while you have ${currentVersion} version installed`
    );
  }
  return ok;
}
