/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 6th June 2023 4:57:01 pm
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

import { Uri } from "vscode";
import { AbstractCloning } from "../../common/abstractCloning";
import { readParameter } from "../../idfConfiguration";

export class RainmakerCloning extends AbstractCloning {
  constructor(gitBinPath: string = "git") {
    super(
      "https://github.com/espressif/esp-rainmaker.git",
      "ESP-RAINMAKER",
      "master",
      gitBinPath,
      "https://gitee.com/EspressifSystems/esp-rainmaker.git"
    );
  }
}

export async function getEspRainmaker(workspace?: Uri) {
  const gitPath = (readParameter("idf.gitPath", workspace) as string) || "git";
  const rainmakerInstaller = new RainmakerCloning(gitPath);
  await rainmakerInstaller.getRepository("idf.espRainmakerPath", workspace);
}
