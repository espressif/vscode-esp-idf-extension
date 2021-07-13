// Copyright 2019 Espressif Systems (Shanghai) CO LTD
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { join } from "path";
import { Progress } from "vscode";
import { getExamplesList, IExampleCategory } from "../examples/Example";
import { IComponent } from "../espIdf/idfComponent/IdfComponent";
import * as idfConf from "../idfConfiguration";
import { IdfBoard, IdfTarget } from "../views/new-project/store";
import { SerialPort } from "../espIdf/serial/serialPort";
import { dirExistPromise } from "../utils";
import { readJSON } from "fs-extra";
import { Logger } from "../logger/logger";

export interface INewProjectArgs {
  espIdfPath: string;
  espAdfPath: string;
  espMdfPath: string;
  boards: IdfBoard[];
  components: IComponent[];
  serialPortList: string[];
  targetList: IdfTarget[];
  templates: { [key: string]: IExampleCategory };
}

const defTargetList: IdfTarget[] = [
  {
    id: "esp32",
    name: "ESP32",
    openOcdFiles: "interface/ftdi/esp32_devkitj_v1.cfg,target/esp32.cfg",
  } as IdfTarget,
  {
    id: "esp32s2",
    name: "ESP32-S2",
    openOcdFiles: "interface/ftdi/esp32_devkitj_v1.cfg,target/esp32s2.cfg",
  } as IdfTarget,
  {
    id: "esp32s3",
    name: "ESP32-S3",
    openOcdFiles: "interface/ftdi/esp32_devkitj_v1.cfg,target/esp32s3.cfg",
  } as IdfTarget,
  {
    id: "esp32c3",
    name: "ESP32-C3 USB",
    openOcdFiles: "board/esp32c3-builtin.cfg",
  } as IdfTarget,
  {
    id: "esp32c3",
    name: "ESP32-C3 PROG",
    openOcdFiles: "board/esp32c3-ftdi.cfg",
  } as IdfTarget,
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
    return;
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
      target: defTargetList[0].id,
      configFiles: defTargetList[0].openOcdFiles,
    } as IdfBoard;
    espBoards.push(emptyBoard);
    return espBoards;
  } catch (error) {
    Logger.error(error.message, error);
    return;
  }
}

export async function getNewProjectArgs(
  extensionPath: string,
  progress: Progress<{ message: string; increment: number }>
) {
  progress.report({ increment: 10, message: "Loading ESP-IDF components..." });
  const components = [];
  progress.report({ increment: 10, message: "Loading serial ports..." });
  let serialPortList: Array<string>;
  try {
    const serialPortListDetails = await SerialPort.shared().getListArray();
    serialPortList = serialPortListDetails.map((p) => p.comName);
  } catch (error) {
    const msg = error.message
      ? error.message
      : "Error looking for serial ports.";
    Logger.infoNotify(msg);
    Logger.error(msg, error);
    serialPortList = ["no port"];
  }
  progress.report({ increment: 10, message: "Loading ESP-IDF Boards list..." });
  const espBoards = await getBoards();
  progress.report({ increment: 10, message: "Loading ESP-IDF Target list..." });
  const targetList = defTargetList;
  progress.report({ increment: 10, message: "Loading ESP-IDF Target list..." });
  const espIdfPath = idfConf.readParameter("idf.espIdfPath") as string;
  const espAdfPath = idfConf.readParameter("idf.espAdfPath") as string;
  const espMdfPath = idfConf.readParameter("idf.espMdfPath") as string;
  let templates: { [key: string]: IExampleCategory } = {};
  templates["Extension"] = getExamplesList(extensionPath, "templates");
  const idfExists = await dirExistPromise(espIdfPath);
  if (idfExists) {
    const idfTemplates = getExamplesList(espIdfPath);
    templates["ESP-IDF"] = idfTemplates;
  }
  const adfExists = await dirExistPromise(espAdfPath);
  if (adfExists) {
    const adfTemplates = getExamplesList(espAdfPath);
    templates["ESP-ADF"] = adfTemplates;
  }
  const mdfExists = await dirExistPromise(espMdfPath);
  if (mdfExists) {
    const mdfTemplates = getExamplesList(espMdfPath);
    templates["ESP-MDF"] = mdfTemplates;
  }
  progress.report({ increment: 50, message: "Initializing wizard..." });
  return {
    boards: espBoards,
    components,
    espAdfPath: adfExists ? espAdfPath : undefined,
    espIdfPath: idfExists ? espIdfPath : undefined,
    espMdfPath: mdfExists ? espMdfPath : undefined,
    serialPortList,
    targetList,
    templates,
  } as INewProjectArgs;
}
