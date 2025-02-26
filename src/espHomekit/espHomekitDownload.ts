/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 29th January 2024 5:23:22 pm
 * Copyright 2024 Espressif Systems (Shanghai) CO LTD
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
import { AbstractCloning } from "../common/abstractCloning";
import { readParameter } from "../idfConfiguration";

export class EspHomekitCloning extends AbstractCloning {
  constructor(gitBinPath: string = "git") {
    super(
      "https://github.com/espressif/esp-homekit-sdk.git",
      "ESP-HomeKit-SDK",
      "master",
      gitBinPath,
      "https://gitee.com/EspressifSystems/esp-homekit-sdk"
    );
  }
}

export async function getEspHomeKitSdk(workspace: Uri) {
  const gitPath = (await readParameter("idf.gitPath", workspace)) || "git";
  const homeKitInstaller = new EspHomekitCloning(gitPath);
  await homeKitInstaller.getRepository("HOMEKIT_PATH", workspace);
}
