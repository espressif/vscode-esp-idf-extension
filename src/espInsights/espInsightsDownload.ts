/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 30th May 2024 2:07:24 pm
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

export class EspInsightsCloning extends AbstractCloning {
  constructor(gitBinPath: string = "git") {
    super(
      "https://github.com/espressif/esp-insights.git",
      "ESP-Insights",
      "main",
      gitBinPath,
      "https://gitee.com/EspressifSystems/esp-insights.git"
    );
  }
}

export async function getEspInsights(workspace: Uri) {
  const gitPath = await readParameter("idf.gitPath", workspace) || "git";
  const insightsInstaller = new EspInsightsCloning(gitPath);
  await insightsInstaller.getRepository("idf.espInsightsPath", workspace);
}

