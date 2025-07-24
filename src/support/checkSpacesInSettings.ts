/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 19th July 2022 1:35:38 pm
 * Copyright 2022 Espressif Systems (Shanghai) CO LTD
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
import { delimiter } from "path";
import { checkSpacesInPath } from "../utils";
import { reportObj } from "./types";

export function checkSpacesInSettings(reportedResult: reportObj) {
  reportedResult.configurationSpacesValidation.espAdfPath = checkSpacesInPath(
    reportedResult.configurationSettings.espAdfPath
  );

  reportedResult.configurationSpacesValidation.espIdfPath = checkSpacesInPath(
    reportedResult.configurationSettings.espIdfPath
  );

  reportedResult.configurationSpacesValidation.espMatterPath = checkSpacesInPath(
    reportedResult.configurationSettings.espMatterPath
  );

  reportedResult.configurationSpacesValidation.espMdfPath = checkSpacesInPath(
    reportedResult.configurationSettings.espMdfPath
  );

  reportedResult.configurationSpacesValidation.espHomeKitPath = checkSpacesInPath(
    reportedResult.configurationSettings.espHomeKitPath
  );

  reportedResult.configurationSpacesValidation.pythonBinPath = checkSpacesInPath(
    reportedResult.configurationSettings.pythonBinPath
  );

  reportedResult.configurationSpacesValidation.toolsPath = checkSpacesInPath(
    reportedResult.configurationSettings.toolsPath
  );
  reportedResult.configurationSpacesValidation.gitPath = checkSpacesInPath(
    reportedResult.configurationSettings.gitPath
  );

  reportedResult.configurationSpacesValidation.customExtraPaths = {};
  if (
    reportedResult.configurationSettings.customExtraPaths &&
    reportedResult.configurationSettings.customExtraPaths.length
  ) {
    const toolPathsArray = reportedResult.configurationSettings.customExtraPaths.split(
      delimiter
    );
    for (const tool of toolPathsArray) {
      reportedResult.configurationSpacesValidation.customExtraPaths[
        tool
      ] = checkSpacesInPath(tool);
    }
  }
  reportedResult.configurationSpacesValidation.systemEnvPath = checkSpacesInPath(
    reportedResult.configurationSettings.systemEnvPath
  );
}
