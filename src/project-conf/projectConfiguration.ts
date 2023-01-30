/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 17th January 2023 2:17:09 pm
 * Copyright 2023 Espressif Systems (Shanghai) CO LTD
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

import { readFile } from "fs-extra";
import { parse } from "@iarna/toml";

export class ProjectConfigurationElement {
  public default: string;
  public title: string;
  public type: string;
  public value: string[];
}

export interface ProjectConfElement {
  build: {
    compileArgs: string[];
    ninjaArgs: string[];
    buildDirectoryPath: string;
    sdkconfigDefaults: string[];
  };
  env: { [key: string]: string };
  flashBaudRate: string;
  idfTarget: string;
  openOCD: {
    debugLevel: number;
    configs: string[];
    args: string[];
  };
  tasks: {
    preBuild: string;
    preFlash: string;
    postBuild: string;
    postFlash: string;
  };
}

export async function getConfAsObj(filePath: string) {
  const confStr = await readFile(filePath, "utf8");
  const confObj = parse(confStr);
  console.log(confObj);
  const projectConfDict: { [key: string]: ProjectConfElement } = {};
  Object.keys(confObj).map((confKey: string) => {
    projectConfDict[confKey] = {
      build: {
        compileArgs: confObj[confKey]["build"]
          ? confObj[confKey]["build"]["compileArgs"]
          : null,
        ninjaArgs: confObj[confKey]["build"]
          ? confObj[confKey]["build"]["ninjaArgs"]
          : null,
        buildDirectoryPath: confObj[confKey]["build"]
          ? confObj[confKey]["build"]["buildDirectoryPath"]
          : null,
      },
      flashBaudRate: confObj[confKey]["flashBaudRate"],
      idfTarget: confObj[confKey]["idfTarget"],
      openOCD: {
        args: confObj[confKey]["openOCD"]
          ? confObj[confKey]["openOCD"]["args"]
          : null,
        configs: confObj[confKey]["openOCD"]
          ? confObj[confKey]["openOCD"]["configs"]
          : null,
        debugLevel: confObj[confKey]["openOCD"]
          ? confObj[confKey]["openOCD"]["debugLevel"]
          : null,
      },
      tasks: {
        preBuild: confObj[confKey]["tasks"]
          ? confObj[confKey]["tasks"]["preBuild"]
          : null,
        preFlash: confObj[confKey]["tasks"]
          ? confObj[confKey]["tasks"]["preFlash"]
          : null,
        postBuild: confObj[confKey]["tasks"]
          ? confObj[confKey]["tasks"]["postBuild"]
          : null,
        postFlash: confObj[confKey]["tasks"]
          ? confObj[confKey]["tasks"]["postFlash"]
          : null,
      },
    } as ProjectConfElement;
    if (confObj[confKey]["env"]) {
      projectConfDict[confKey]["env"] = {};
      Object.keys(confObj[confKey]["env"]).map((envKey) => {
        projectConfDict[confKey]["env"][envKey] =
          confObj[confKey]["env"][envKey];
      });
    }
  });
  // const confObj = parse(confStr); // read file Object
  // console.log(confObj);
  return projectConfDict;
}
