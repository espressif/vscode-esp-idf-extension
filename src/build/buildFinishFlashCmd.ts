/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 31st March 2026 2:32:25 pm
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

import { Uri } from "vscode";
import { readParameter } from "../idfConfiguration";
import { join } from "path";
import { pathExists } from "fs-extra";
import { createFlashModel } from "../flash/uart/flashModelBuilder";

export async function buildFinishFlashCmd(workspace: Uri) {
  const buildPath = readParameter("idf.buildPath", workspace) as string;
  const flasherArgsPath = join(buildPath, "flasher_args.json");
  const flasherArgsExists = await pathExists(flasherArgsPath);
  if (!flasherArgsExists) {
    return "";
  }
  const port = readParameter("idf.port", workspace) as string;
  const flashBaudRate = readParameter("idf.flashBaudRate", workspace);

  const flasherArgsModel = await createFlashModel(
    flasherArgsPath,
    port,
    flashBaudRate
  );

  let flashFiles = `--flash_mode ${flasherArgsModel.mode}`;
  flashFiles += ` --flash_size ${flasherArgsModel.size}`;
  flashFiles += ` --flash_freq ${flasherArgsModel.frequency} `;
  for (const flashFile of flasherArgsModel.flashSections) {
    flashFiles += `${flashFile.address} "${flashFile.binFilePath}" `;
  }

  let flashString = "Project build complete. To flash, run:\n";
  flashString +=
    "ESP-IDF: Flash your project in the ESP-IDF Visual Studio Code Extension\n";
  flashString += "or in a ESP-IDF Terminal:\n";
  flashString += "idf.py flash\n";
  flashString += `or\r\nidf.py ${
    port && port !== "detect" ? `-p ${port}` : ""
  } flash\n`;
  flashString += "or\r\n";
  flashString += `python -m esptool --chip ${
    flasherArgsModel.chip
  } -b ${flashBaudRate} --before ${flasherArgsModel.before} --after ${
    flasherArgsModel.after
  } ${flasherArgsModel.stub === false ? "--no-stub" : ""} ${
    port && port !== "detect" ? `--port ${port}` : ""
  } write_flash ${flashFiles}\n`;
  flashString += `or from the "${buildPath}" directory\n`;
  flashString += `python -m esptool --chip ${flasherArgsModel.chip} `;
  flashString += `-b ${flashBaudRate} --before ${flasherArgsModel.before} `;
  flashString += `--after ${flasherArgsModel.after} write_flash "@flash_args"`;
  return flashString;
}
