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

export interface ProjectConfElement {
  build: {
    compileArgs: string[];
    ninjaArgs: string[];
    buildDirectoryPath: string;
    sdkconfigDefaults: string[];
  };
  env: { [key: string]: string };
  flashBaudRate: string;
  monitorBaudRate: string;
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
