/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 22nd October 2019 8:18:32 pm
 * Copyright 2019 Espressif Systems (Shanghai) CO LTD
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

import { readJSON } from "fs-extra";
import { FlashModel, FlashSection } from "./flashModel";

export async function createFlashModel(
  modelJsonPath: string,
  port: string,
  baudRate: string
): Promise<FlashModel> {
  const flashArgsJson = await readJSON(modelJsonPath);
  const flashModel: FlashModel = {
    app: {
      address: flashArgsJson.app ? flashArgsJson.app.offset : undefined,
      binFilePath: flashArgsJson.app ? flashArgsJson.app.file : undefined,
      encrypted: flashArgsJson.app ? flashArgsJson.app.encrypted : undefined,
    } as FlashSection,
    after: flashArgsJson.extra_esptool_args.after,
    before: flashArgsJson.extra_esptool_args.before,
    baudRate,
    chip: flashArgsJson.extra_esptool_args.chip,
    flashSections: [],
    frequency: flashArgsJson.flash_settings.flash_freq,
    mode: flashArgsJson.flash_settings.flash_mode,
    port,
    size: flashArgsJson.flash_settings.flash_size,
    stub: flashArgsJson.extra_esptool_args.stub,
  };
  addFlashSectionToModel(flashArgsJson, flashModel);
  Object.keys(flashArgsJson.flash_files).forEach((fileKey) => {
    const existingFlashSection = flashModel.flashSections.length
      ? flashModel.flashSections.filter(
          (section) => section.address.indexOf(fileKey) !== -1
        )
      : [];
    if (fileKey && !existingFlashSection.length) {
      flashModel.flashSections.push({
        address: fileKey,
        binFilePath: flashArgsJson.flash_files[fileKey],
        encrypted: false
      } as FlashSection);
    }
  });
  return flashModel;
}

function addFlashSectionToModel(flashArgsJson, model: FlashModel) {
  for (let modelKey of Object.keys(flashArgsJson)) {
    if (
      flashArgsJson[modelKey] &&
      flashArgsJson[modelKey].offset &&
      flashArgsJson[modelKey].file &&
      flashArgsJson[modelKey].encrypted
    ) {
      const newFlashSection = {
        address: flashArgsJson[modelKey].offset,
        binFilePath: flashArgsJson[modelKey].file,
        encrypted: flashArgsJson[modelKey].encrypted.indexOf("true") !== -1,
      } as FlashSection;
      model.flashSections.push(newFlashSection);
    }
  }
}
