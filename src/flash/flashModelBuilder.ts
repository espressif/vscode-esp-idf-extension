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
        address: flashArgsJson.app ? flashArgsJson.app.offset : undefined,
        binFilePath: flashArgsJson.app ? flashArgsJson.app.file : undefined,
        encrypted: flashArgsJson.app ? flashArgsJson.app.encrypted : undefined,
      } as FlashSection,
      after: flashArgsJson.extra_esptool_args.after,
      before: flashArgsJson.extra_esptool_args.before,
      bootloader: {
        address: flashArgsJson.bootloader
          ? flashArgsJson.bootloader.offset
          : undefined,
        binFilePath: flashArgsJson.bootloader
          ? flashArgsJson.bootloader.file
          : undefined,
        encrypted: flashArgsJson.bootloader
          ? flashArgsJson.bootloader.encrypted
          : undefined,
      } as FlashSection,
      partitionTable: {
        address: flashArgsJson.partition_table
          ? flashArgsJson.partition_table.offset
          : undefined,
        binFilePath: flashArgsJson.partition_table
          ? flashArgsJson.partition_table.file
          : undefined,
        encrypted: flashArgsJson.partition_table
          ? flashArgsJson.partition_table.encrypted
          : undefined,
      } as FlashSection,
      baudRate,
      chip: flashArgsJson.extra_esptool_args.chip,
      encryptedFlashSections: [],
      flashSections: [],
      frequency: flashArgsJson.flash_settings.flash_freq,
      mode: flashArgsJson.flash_settings.flash_mode,
      port,
      size: flashArgsJson.flash_settings.flash_size,
      storage: {
        address: flashArgsJson.storage
          ? flashArgsJson.storage.offset
          : undefined,
        binFilePath: flashArgsJson.storage
          ? flashArgsJson.storage.file
          : undefined,
        encrypted: flashArgsJson.storage
          ? flashArgsJson.storage.encrypted
          : undefined,
      },
      stub: flashArgsJson.extra_esptool_args.stub,
    };

    addSectionToModel(flashModel.app, flashModel);
    addSectionToModel(flashModel.bootloader, flashModel);
    addSectionToModel(flashModel.partitionTable, flashModel);
    addSectionToModel(flashModel.storage, flashModel);

    Object.keys(flashArgsJson.flash_files).forEach((fileKey) => {
      const existingFlashSection = flashModel.flashSections.length
        ? flashModel.flashSections.filter(
            (section) => section.address.indexOf(fileKey) !== -1
          )
        : [];
      const existingEncryptedFlashSection = flashModel.encryptedFlashSections
        .length
        ? flashModel.encryptedFlashSections.filter(
            (section) => section.address.indexOf(fileKey) !== -1
          )
        : [];
      if (
        fileKey &&
        !existingEncryptedFlashSection.length &&
        !existingFlashSection.length
      ) {
        flashModel.flashSections.push({
          address: fileKey,
          binFilePath: flashArgsJson.flash_files[fileKey],
        } as FlashSection);
      }
    });
    return flashModel;
  });
}

function addSectionToModel(flashSection: FlashSection, model: FlashModel) {
  if (flashSection && flashSection.address && flashSection.binFilePath) {
    flashSection.encrypted && flashSection.encrypted.indexOf("true") !== -1
      ? model.encryptedFlashSections.push(flashSection)
      : model.flashSections.push(flashSection);
  }
}
