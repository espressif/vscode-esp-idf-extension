/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 14th April 2026 4:36:21 pm
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

import { join } from "path";
import { getDfuList, selectDfuDevice, selectedDFUAdapterId } from "./helpers";

export async function dfuFlashingArgs(
  pythonBinPath: string,
  modifiedEnv: { [key: string]: string },
  chipFromFlashModel: string,
  buildDirPath: string
) {
  const listDfuDevices = (await getDfuList(modifiedEnv)) as string[];
  let cmd: string;
  let args: string[] = [];
  if (listDfuDevices.length > 0) {
    const selectedDfuPath = await selectDfuDevice(listDfuDevices);
    if (!selectedDfuPath) {
      return;
    }
    cmd = pythonBinPath;
    const idfPy = join(modifiedEnv["IDF_PATH"]!, "tools", "idf.py");
    args = [idfPy, "dfu-flash", "--path", selectedDfuPath];
  } else {
    cmd = "dfu-util";
    args = [
      "-d",
      `303a:${selectedDFUAdapterId(chipFromFlashModel).toString(16)}`,
      "-D",
      join(buildDirPath, "dfu.bin"),
    ];
  }
  return { cmdToUse: cmd, args };
}
