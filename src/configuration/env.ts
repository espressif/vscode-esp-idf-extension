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

import { join } from "path";
import { ESP } from "../config";

export type IdfEnvMap = Record<string, string>;

export function getCurrentIdfConfiguration(): IdfEnvMap {
  return ESP.ProjectConfiguration.store.get<IdfEnvMap>(
    ESP.ProjectConfiguration.CURRENT_IDF_CONFIGURATION,
    {}
  );
}

export function getCurrentIdfEnvVar(name: string): string | undefined {
  const value = getCurrentIdfConfiguration()[name];
  if (typeof value === "string" && value !== "") {
    return value;
  }
  return undefined;
}

export function getVirtualEnvPythonPath() {
  const currentEnvVars = getCurrentIdfConfiguration();
  if (currentEnvVars["IDF_PYTHON_ENV_PATH"]) {
    const pyDir =
      process.platform === "win32"
        ? ["Scripts", "python.exe"]
        : ["bin", "python3"];
    const venvPythonPath = join(
      currentEnvVars["IDF_PYTHON_ENV_PATH"],
      ...pyDir
    );
    return venvPythonPath;
  }
}
