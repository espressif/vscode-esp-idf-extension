/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 13th April 2026 6:14:03 pm
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

import { ESP } from "../../config";
import { FlashModel } from "../types/flashModel";

export function buildBaseWriteFlashArgs(
  model: FlashModel,
  toolPath: string
): string[] {
  const flasherArgs = [
    toolPath,
    "-p",
    model.port,
    "-b",
    model.baudRate,
    "--before",
    model.before,
    "--after",
    model.after,
  ];
  if (model.chip) {
    flasherArgs.push("--chip", model.chip);
  }
  if (typeof model.stub !== undefined && !model.stub) {
    flasherArgs.push("--no-stub");
  }
  flasherArgs.push("write_flash", ...model.writeFlashArgs);
  return flasherArgs;
}

export function formatBinPath(
  binFilePath: string,
  replacePathSep: boolean
): string {
  return replacePathSep ? binFilePath.replace(/\//g, "\\") : binFilePath;
}

export function getSingleBinFlasherArgs(
  model: FlashModel,
  toolPath: string,
  sectionToUse: ESP.BuildType,
  replacePathSep: boolean = false
) {
  const flasherArgs = buildBaseWriteFlashArgs(model, toolPath);
  const section = model[sectionToUse];
  if (section.encrypted) {
    flasherArgs.push("--encrypt-files");
  }
  flasherArgs.push(
    section.address,
    formatBinPath(section.binFilePath, replacePathSep)
  );
  return flasherArgs;
}

export function getFlasherArgs(
  model: FlashModel,
  toolPath: string,
  encryptPartitions: boolean,
  replacePathSep: boolean = false
) {
  const flasherArgs = buildBaseWriteFlashArgs(model, toolPath);
  const encryptedFlashSections = model.flashSections.filter(
    (flashSection) => flashSection.encrypted
  );
  if (
    encryptPartitions &&
    encryptedFlashSections &&
    encryptedFlashSections.length
  ) {
    if (
      model.flashSections &&
      model.flashSections.length === encryptedFlashSections.length
    ) {
      // If all files need encryption, then use --encrypt flag
      flasherArgs.push("--encrypt");
      // Add all files
      for (const flashFile of model.flashSections) {
        flasherArgs.push(
          flashFile.address,
          formatBinPath(flashFile.binFilePath, replacePathSep)
        );
      }
    } else {
      // If only some files need encryption, handle them separately
      // First add all unencrypted files normally
      const unencryptedSections = model.flashSections.filter(
        (section) => !section.encrypted
      );
      for (const flashFile of unencryptedSections) {
        flasherArgs.push(
          flashFile.address,
          formatBinPath(flashFile.binFilePath, replacePathSep)
        );
      }
      // Then add encrypted files after the --encrypt-files flag
      flasherArgs.push("--encrypt-files");
      for (const flashFile of encryptedFlashSections) {
        flasherArgs.push(
          flashFile.address,
          formatBinPath(flashFile.binFilePath, replacePathSep)
        );
      }
    }
  } else {
    // No encryption needed, just add all files.
    for (const flashFile of model.flashSections) {
      flasherArgs.push(
        flashFile.address,
        formatBinPath(flashFile.binFilePath, replacePathSep)
      );
    }
  }

  return flasherArgs;
}
