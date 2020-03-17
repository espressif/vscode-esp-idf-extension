/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 22nd October 2019 8:18:32 pm
 * Copyright 2019 Espressif Systems (Shanghai) CO LTD
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { readJSON } from "fs-extra";
import { FlashModel, FlashSection } from "./flashModel";

export function createFlashModel(
  modelJsonPath: string,
  port: string,
  baudRate: string
): Promise<FlashModel> {
  return readJSON(modelJsonPath).then(flashArgsJson => {
    const flashModel: FlashModel = {
      baudRate,
      port,
      size: flashArgsJson.flash_settings.flash_size,
      frequency: flashArgsJson.flash_settings.flash_freq,
      mode: flashArgsJson.flash_settings.flash_mode,
      flashSections: []
    };
    Object.keys(flashArgsJson.flash_files).forEach(fileKey => {
      if (fileKey && flashArgsJson.flash_files[fileKey]) {
        flashModel.flashSections.push({
          address: fileKey,
          binFilePath: flashArgsJson.flash_files[fileKey]
        } as FlashSection);
      }
    });
    return flashModel;
  });
}
