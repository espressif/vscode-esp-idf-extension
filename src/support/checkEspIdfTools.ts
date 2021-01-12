/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 30th December 2020 4:40:28 pm
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
import { pathExists, readJSON } from "fs-extra";
import { join } from "path";
import * as vscode from "vscode";
import { IdfToolsManager } from "../idfToolsManager";
import { PlatformInformation } from "../PlatformInformation";
import { OutputChannel } from "../logger/outputChannel";
import { reportObj } from "./types";

export async function checkEspIdfTools(
  reportedResult: reportObj,
  context: vscode.ExtensionContext
) {
  const platformInfo = await PlatformInformation.GetPlatformInformation();
  let toolsJsonPath: string = join(
    reportedResult.configurationSettings.espIdfPath,
    "tools",
    "tools.json"
  );
  const jsonExists = await pathExists(toolsJsonPath);
  if (!jsonExists) {
    const idfToolsJsonToUse =
      reportedResult.espIdfVersion.result.localeCompare("4.0") < 0
        ? "fallback-tools.json"
        : "tools.json";
    toolsJsonPath = join(context.extensionPath, idfToolsJsonToUse);
  }
  const toolsJson = await readJSON(toolsJsonPath);
  const idfToolsManager = new IdfToolsManager(
    toolsJson,
    platformInfo,
    OutputChannel.init()
  );
  const verifiedPkgs = await idfToolsManager.getRequiredToolsInfo(
    reportedResult.configurationSettings.toolsPath,
    reportedResult.configurationSettings.customExtraPaths
  );
  reportedResult.espIdfToolsVersions = verifiedPkgs;
}
