/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 8th January 2021 5:34:24 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
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
import * as idfConf from "../../idfConfiguration";
import { readJSON } from "fs-extra";
import { Logger } from "../../logger/logger";
import { Uri } from "vscode";

export interface IdfBoard {
  name: string;
  description: string;
  target: string;
  configFiles: string[];
}

export const defaultBoards = [
  {
    name: "ESP32 module",
    description: "ESP32 used with ESP-PROG board",
    target: "esp32",
    configFiles: ["interface/ftdi/esp32_devkitj_v1.cfg", "target/esp32.cfg"],
  } as IdfBoard,
  {
    name: "ESP32-S2 module",
    description: "ESP32-S2 used with ESP-PROG board",
    target: "esp32s2",
    configFiles: ["interface/ftdi/esp32_devkitj_v1.cfg", "target/esp32s2.cfg"],
  } as IdfBoard,
  {
    name: "ESP32-S3 chip (via ESP-PROG)",
    description: "ESP32-S3 used with ESP-PROG board",
    target: "esp32s3",
    configFiles: ["interface/ftdi/esp32_devkitj_v1.cfg", "target/esp32s3.cfg"],
  } as IdfBoard,
  {
    name: "ESP32-S3 chip (via builtin USB-JTAG)",
    description: "ESP32-S3 debugging via builtin USB-JTAG",
    target: "esp32s3",
    configFiles: ["board/esp32s3-builtin.cfg"],
  } as IdfBoard,
  {
    name: "ESP32-C3 chip (via ESP-PROG)",
    description: "ESP32-C3 used with ESP-PROG board",
    target: "esp32c3",
    configFiles: ["board/esp32c3-ftdi.cfg"],
  } as IdfBoard,
  {
    name: "ESP32-C3 chip (via builtin USB-JTAG)",
    description: "ESP32-C3 debugging via builtin USB-JTAG",
    target: "esp32c3",
    configFiles: ["board/esp32c3-builtin.cfg"],
  } as IdfBoard,
];

export function getOpenOcdScripts(workspace: Uri): string {
  const customExtraVars = idfConf.readParameter(
    "idf.customExtraVars",
    workspace
  );
  let openOcdScriptsPath: string;
  try {
    const jsonDict = JSON.parse(customExtraVars);
    openOcdScriptsPath = jsonDict.hasOwnProperty("OPENOCD_SCRIPTS")
      ? jsonDict.OPENOCD_SCRIPTS
      : process.env.OPENOCD_SCRIPTS
      ? process.env.OPENOCD_SCRIPTS
      : undefined;
  } catch (error) {
    Logger.error(error.message, error);
    openOcdScriptsPath = process.env.OPENOCD_SCRIPTS
      ? process.env.OPENOCD_SCRIPTS
      : undefined;
  }
  return openOcdScriptsPath;
}

export async function getBoards(openOcdScriptsPath: string = "") {
  if (!openOcdScriptsPath) {
    return defaultBoards;
  }
  const openOcdEspConfig = join(openOcdScriptsPath, "esp-config.json");
  try {
    const openOcdEspConfigObj = await readJSON(openOcdEspConfig);
    const espBoards: IdfBoard[] = openOcdEspConfigObj.boards.map((b) => {
      return {
        name: b.name,
        description: b.description,
        target: b.target,
        configFiles: b.config_files,
      } as IdfBoard;
    });
    const emptyBoard = {
      name: "Custom board",
      description: "No board selected",
      target: "esp32",
      configFiles: ["interface/ftdi/esp32_devkitj_v1.cfg", "target/esp32.cfg"],
    } as IdfBoard;
    espBoards.push(emptyBoard);
    return espBoards;
  } catch (error) {
    Logger.error(error.message, error);
    return defaultBoards;
  }
}
