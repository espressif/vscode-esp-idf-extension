/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 30th December 2020 4:34:31 pm
 * Copyright 2020 Espressif Systems (Shanghai) CO LTD
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
import { getEspIdfFromCMake } from "../utils";
import { execChildProcess } from "./execChildProcess";
import { reportObj } from "./types";

const ESP_IDF_VERSION_REGEX = /v(\d+)(?:\.)?(\d+)?(?:\.)?(\d+)?.*/;

export async function getEspIdfVersion(reportedResult: reportObj) {
  try {
    const rawEspIdfVersion = await execChildProcess(
      `"${reportedResult.configurationSettings.gitPath}" describe --tags`,
      reportedResult.configurationSettings.espIdfPath
    );
    reportedResult.espIdfVersion.output = rawEspIdfVersion;
    const espIdfVersionMatch = rawEspIdfVersion.match(ESP_IDF_VERSION_REGEX);
    if (espIdfVersionMatch && espIdfVersionMatch.length) {
      let espVersion: string = "";
      for (let i = 1; i < espIdfVersionMatch.length; i++) {
        if (espIdfVersionMatch[i]) {
          espVersion = `${espVersion}.${espIdfVersionMatch[i]}`;
        }
      }
      reportedResult.espIdfVersion.result = espVersion.substr(1);
    } else {
      reportedResult.espIdfVersion.result = "Not found";
    }
  } catch (error) {
    const espIdfVersionFromCmake = await getEspIdfFromCMake(
      reportedResult.configurationSettings.espIdfPath
    );
    if (espIdfVersionFromCmake) {
      reportedResult.espIdfVersion.result = espIdfVersionFromCmake;
      return;
    }
    reportedResult.espIdfVersion.result = "Not found";
    reportedResult.latestError = error;
  }
}
