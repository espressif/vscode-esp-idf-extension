/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 16th February 2023 5:54:08 pm
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

import { ESP } from "../config";
import { ProjectConfElement } from "../project-conf/projectConfiguration";
import { reportObj } from "./types";

export async function getProjectConfigurations(reportedResult: reportObj) {
  const currentProjectConfKey = ESP.ProjectConfiguration.store.get<string>(
    ESP.ProjectConfiguration.SELECTED_CONFIG
  );
  if (!currentProjectConfKey) {
    return "";
  }
  const currentProjectConf = ESP.ProjectConfiguration.store.get<
    ProjectConfElement
  >(currentProjectConfKey);
  reportedResult.projectConfigurations = {
    currentProjectConfKey: currentProjectConf,
  };
}

export function getSelectedProjectConfiguration(reportedResult: reportObj) {
  reportedResult.selectedProjectConfiguration = ESP.ProjectConfiguration.store.get<
    string
  >(ESP.ProjectConfiguration.SELECTED_CONFIG);
}
