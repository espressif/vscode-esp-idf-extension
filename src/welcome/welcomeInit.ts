/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 29th November 2021 5:08:14 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
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

import { Progress, Uri } from "vscode";
import { readParameter } from "../idfConfiguration";
import { packageJson } from "../utils";

export interface IWelcomeArgs {
  espIdf: string;
  extensionVersion: string;
  showOnInit: boolean;
}

export async function getWelcomePageInitialValues(
  progress: Progress<{ message: string; increment: number }>,
  workspace?: Uri
) {
  progress.report({ increment: 20, message: "Getting extension version..." });
  const extensionVersion = packageJson.version as string;
  const customExtraVars = readParameter(
    "idf.customExtraVars",
    workspace
  ) as { [key: string]: string };
  const confShowOnboardingOnInit = readParameter(
    "idf.showOnboardingOnInit"
  ) as boolean;
  const welcomePageArgs = {
    espIdf: customExtraVars["IDF_PATH"],
    extensionVersion,
    showOnInit: confShowOnboardingOnInit,
  };
  return welcomePageArgs;
}
