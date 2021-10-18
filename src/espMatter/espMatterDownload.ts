/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 18th October 2021 2:27:27 pm
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
import { AbstractCloning } from "../common/abstractCloning";
import { readParameter } from "../idfConfiguration";

export class EspMatterCloning extends AbstractCloning {
  constructor(gitBinPath: string = "git") {
    super(
      "https://github.com/espressif/esp-matter.git",
      "ESP-MATTER",
      "master",
      gitBinPath
    );
  }
}

export async function getEspMatter() {
  const gitPath = (await readParameter("idf.gitPath")) || "git";
  const espMatterInstaller = new EspMatterCloning(gitPath);
  await espMatterInstaller.getRepository("idf.espMatterPath");
}
