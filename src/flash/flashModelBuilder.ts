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
  return readJSON(modelJsonPath).then((flashArgsJson) => {
    const flashModel: FlashModel = {
      app: {
        address: flashArgsJson.app.offset,
        binFilePath: flashArgsJson.app.file,
        encrypted: flashArgsJson.app.encrypted,
      } as FlashSection,
      after: flashArgsJson.extra_esptool_args.after,
      before: flashArgsJson.extra_esptool_args.before,
      bootloader: {
        address: flashArgsJson.bootloader.offset,
        binFilePath: flashArgsJson.bootloader.file,
        encrypted: flashArgsJson.bootloader.encrypted,
      } as FlashSection,
      partitionTable: {
        address: flashArgsJson.partition_table.offset,
        binFilePath: flashArgsJson.partition_table.file,
        encrypted: flashArgsJson.partition_table.encrypted,
      } as FlashSection,
      baudRate,
      chip: flashArgsJson.extra_esptool_args.chip,
      encryptedFlashSections: [],
      flashSections: [],
      frequency: flashArgsJson.flash_settings.flash_freq,
      mode: flashArgsJson.flash_settings.flash_mode,
      port,
      size: flashArgsJson.flash_settings.flash_size,
      stub: flashArgsJson.extra_esptool_args.stub,
    };
    flashModel.bootloader.encrypted &&
    flashModel.bootloader.encrypted.indexOf("true") !== -1
      ? flashModel.encryptedFlashSections.push(flashModel.bootloader)
      : flashModel.flashSections.push(flashModel.bootloader);

    flashModel.app.encrypted && flashModel.app.encrypted.indexOf("true") !== -1
      ? flashModel.encryptedFlashSections.push(flashModel.app)
      : flashModel.flashSections.push(flashModel.app);

    flashModel.partitionTable.encrypted &&
    flashModel.partitionTable.encrypted.indexOf("true") !== -1
      ? flashModel.encryptedFlashSections.push(flashModel.partitionTable)
      : flashModel.flashSections.push(flashModel.partitionTable);
    return flashModel;
  });
}
