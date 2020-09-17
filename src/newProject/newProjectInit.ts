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

import { Progress } from "vscode";
import { getExamplesList, IExample } from "../examples/Example";
import { IComponent } from "../espIdf/idfComponent/IdfComponent";
import * as idfConf from "../idfConfiguration";
import { IdfTarget } from "../views/new-project/store";
import { SerialPort } from "../espIdf/serial/serialPort";
import { dirExistPromise } from "../utils";

export interface INewProjectArgs {
  components: IComponent[];
  serialPortList: string[];
  targetList: IdfTarget[];
  templates: IExample[];
}

const defTargetList: IdfTarget[] = [
  {
    id: "esp32",
    name: "ESP32",
    openOcdFiles: "interface/ftdi/esp32_devkitj_v1.cfg,board/esp32-wrover.cfg",
  } as IdfTarget,
  {
    id: "esp32s2",
    name: "ESP32-S2",
    openOcdFiles: "interface/ftdi/esp32_devkitj_v1.cfg,target/esp32s2.cfg",
  } as IdfTarget,
];

export async function getNewProjectArgs(
  progress: Progress<{ message: string; increment: number }>
) {
  progress.report({ increment: 10, message: "Loading ESP-IDF components..." });
  const components = [];
  progress.report({ increment: 10, message: "Loading serial ports..." });
  const serialPortListDetails = await SerialPort.shared().getListArray();
  const serialPortList = serialPortListDetails.map((p) => p.comName);
  progress.report({ increment: 10, message: "Loading ESP-IDF Target list..." });
  const targetList = defTargetList;
  progress.report({ increment: 10, message: "Loading ESP-IDF Target list..." });
  const espIdfPath = idfConf.readParameter("idf.espIdfPath") as string;
  const espAdfPath = idfConf.readParameter("idf.espAdfPath") as string;
  const espMdfPath = idfConf.readParameter("idf.espMdfPath") as string;
  const templates = [];
  const idfExists = await dirExistPromise(espIdfPath);
  if (idfExists) {
    const idfTemplates = getExamplesList(espIdfPath);
    templates.push(idfTemplates);
  }
  const adfExists = await dirExistPromise(espAdfPath);
  if (adfExists) {
    const adfTemplates = getExamplesList(espAdfPath);
    templates.push(adfTemplates);
  }
  const mdfExists = await dirExistPromise(espMdfPath);
  if (mdfExists) {
    const mdfTemplates = getExamplesList(espMdfPath);
    templates.push(mdfTemplates);
  }
  progress.report({ increment: 50, message: "Initializing wizard..." });
  return {
    components,
    serialPortList,
    targetList,
    templates,
  } as INewProjectArgs;
}
