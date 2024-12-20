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
import { defaultBoards } from "./defaultBoards";

export interface IdfBoard {
  name: string;
  description: string;
  target: string;
  configFiles: string[];
}

export async function getOpenOcdScripts(workspace: Uri): Promise<string> {
  const userExtraVars = idfConf.readParameter(
    "idf.customExtraVars",
    workspace
  ) as { [key: string]: string };
  let openOcdScriptsPath: string;
  try {
    openOcdScriptsPath = userExtraVars.hasOwnProperty("OPENOCD_SCRIPTS")
      ? userExtraVars.OPENOCD_SCRIPTS
      : process.env.OPENOCD_SCRIPTS
      ? process.env.OPENOCD_SCRIPTS
      : undefined;
  } catch (error) {
    Logger.error(error.message, error, "boardConfiguration getOpenOcdScripts");
    openOcdScriptsPath = process.env.OPENOCD_SCRIPTS
      ? process.env.OPENOCD_SCRIPTS
      : undefined;
  }
  return openOcdScriptsPath;
}

export async function getBoards(
  openOcdScriptsPath: string = "",
  idfTarget: string = ""
) {
  if (!openOcdScriptsPath) {
    const filteredDefaultBoards = defaultBoards.filter((b) => {
      return b.target === idfTarget;
    });
    return idfTarget ? filteredDefaultBoards : defaultBoards;
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
    const tmpS3Board = {
      name: "ESP32-S3 chip (via builtin USB-JTAG)",
      description: "ESP32-S3 debugging via builtin USB-JTAG",
      target: "esp32s3",
      configFiles: ["board/esp32s3-builtin.cfg"],
    } as IdfBoard;
    if (espBoards.findIndex((b) => b.name === tmpS3Board.name) === -1) {
      espBoards.push(tmpS3Board);
    }
    const emptyBoard = {
      name: "Custom board",
      description: "No board selected",
      target: "esp32",
      configFiles: ["interface/ftdi/esp32_devkitj_v1.cfg", "target/esp32.cfg"],
    } as IdfBoard;
    espBoards.push(emptyBoard);
    const filteredEspBoards = espBoards.filter((b) => {
      return b.target === idfTarget;
    });
    return idfTarget ? filteredEspBoards : espBoards;
  } catch (error) {
    Logger.error(error.message, error, "boardConfiguration getBoards");
    const filteredDefaultBoards = defaultBoards.filter((b) => {
      return b.target === idfTarget;
    });
    return idfTarget ? filteredDefaultBoards : defaultBoards;
  }
}
