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
import { Progress, Uri } from "vscode";
import { getExamplesList, IExampleCategory } from "../examples/Example";
import { IComponent } from "../espIdf/idfComponent/IdfComponent";
import * as idfConf from "../idfConfiguration";
import { SerialPort } from "../espIdf/serial/serialPort";
import { dirExistPromise } from "../utils";
import { Logger } from "../logger/logger";
import {
  getBoards,
  getOpenOcdScripts,
  IdfBoard,
} from "../espIdf/openOcd/boardConfiguration";

export interface INewProjectArgs {
  espIdfPath: string;
  espAdfPath: string;
  espMdfPath: string;
  espMatterPath: string;
  espHomeKitSdkPath: string;
  espRainmakerPath: string;
  boards: IdfBoard[];
  components: IComponent[];
  serialPortList: string[];
  templates: { [key: string]: IExampleCategory };
  workspaceFolder: Uri;
}

export async function getNewProjectArgs(
  extensionPath: string,
  progress: Progress<{ message: string; increment: number }>,
  workspace: Uri
) {
  progress.report({ increment: 10, message: "Loading ESP-IDF components..." });
  const components = [];
  progress.report({ increment: 10, message: "Loading serial ports..." });
  let serialPortList: Array<string>;
  try {
    const serialPortListDetails = await SerialPort.shared().getListArray(
      workspace
    );
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
  const openOcdScriptsPath = await getOpenOcdScripts(workspace);
  let espBoards = await getBoards(openOcdScriptsPath);
  progress.report({ increment: 10, message: "Loading ESP-IDF Target list..." });
  const espIdfPath = idfConf.readParameter(
    "idf.espIdfPath",
    workspace
  ) as string;
  const espAdfPath = idfConf.readParameter(
    "idf.espAdfPath",
    workspace
  ) as string;
  const espMdfPath = idfConf.readParameter(
    "idf.espMdfPath",
    workspace
  ) as string;
  const espMatterPath = idfConf.readParameter(
    "idf.espMatterPath",
    workspace
  ) as string;
  const espHomeKitSdkPath = idfConf.readParameter(
    "idf.espHomeKitSdkPath",
    workspace
  ) as string;
  const espRainmakerPath = idfConf.readParameter(
    "idf.espRainmakerPath",
    workspace
  ) as string;
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
  const rainmakerExists = await dirExistPromise(espRainmakerPath);
  if (rainmakerExists) {
    const rainmakerTemplates = getExamplesList(espRainmakerPath);
    templates["ESP-RAINMAKER"] = rainmakerTemplates;
  }
  const matterExists = await dirExistPromise(espMatterPath);
  if (matterExists) {
    const matterTemplates = getExamplesList(espMatterPath);
    templates["ESP-MATTER"] = matterTemplates;
  }
  const mdfExists = await dirExistPromise(espMdfPath);
  if (mdfExists) {
    const mdfTemplates = getExamplesList(espMdfPath);
    templates["ESP-MDF"] = mdfTemplates;
  }
  const homekitSdkExists = await dirExistPromise(espHomeKitSdkPath);
  if (homekitSdkExists) {
    const homeKitSdkTemplates = getExamplesList(espHomeKitSdkPath);
    templates["ESP-HOMEKIT-SDK"] = homeKitSdkTemplates;
  }
  progress.report({ increment: 50, message: "Initializing wizard..." });
  return {
    boards: espBoards,
    components,
    espAdfPath: adfExists ? espAdfPath : undefined,
    espIdfPath: idfExists ? espIdfPath : undefined,
    espMdfPath: mdfExists ? espMdfPath : undefined,
    espMatterPath: matterExists ? espMatterPath : undefined,
    espHomeKitSdkPath: homekitSdkExists ? espHomeKitSdkPath : undefined,
    espRainmakerPath: rainmakerExists ? espRainmakerPath : undefined,
    serialPortList,
    templates,
  } as INewProjectArgs;
}
