/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 8th January 2021 5:34:24 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
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
import { join } from "path";
import * as idfConf from "../../idfConfiguration";
import { readJSON } from "fs-extra";
import { Logger } from "../../logger/logger";

export interface IdfBoard {
  name: string;
  description: string;
  target: string;
  configFiles: string[];
}

const defaultBoards = [
  {
    name: "ESP32 module",
    description: "ESP32 used with ESP-PROG board",
    target: "esp32",
    configFiles: ["interface/ftdi/esp32_devkitjv1.cfg", "target/esp32.cfg"],
  } as IdfBoard,
  {
    name: "ESP32-S2 module",
    description: "ESP32-S2 used with ESP-PROG board",
    target: "esp32s2",
    configFiles: ["interface/ftdi/esp32_devkitjv1.cfg", "target/esp32s2.cfg"],
  } as IdfBoard,
];

export async function getBoards() {
  const customExtraVars = idfConf.readParameter("idf.customExtraVars");
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
      configFiles: ["interface/ftdi/esp32_devkitjv1.cfg", "target/esp32.cfg"],
    } as IdfBoard;
    espBoards.push(emptyBoard);
    return espBoards;
  } catch (error) {
    Logger.error(error.message, error);
    return defaultBoards;
  }
}
