/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 12th January 2021 7:43:50 pm
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
import { ESP } from "../config";
import { PlatformInformation } from "../PlatformInformation";
import { reportObj } from "./types";
import * as vscode from "vscode";

export async function checkSystemInfo(
  reportedResult: reportObj,
  context: vscode.ExtensionContext
) {
  const platformInfo = await PlatformInformation.GetPlatformInformation();
  const extensionVersion = vscode.extensions.getExtension(ESP.extensionID);
  reportedResult.systemInfo.architecture = platformInfo.architecture;
  reportedResult.systemInfo.envPath =
    process.platform === "win32" ? process.env.Path : process.env.PATH;
  reportedResult.systemInfo.extensionVersion = extensionVersion
    ? extensionVersion.packageJSON.version
    : "ESP-IDF_VERSION_NOT_FOUND";
  reportedResult.systemInfo.language = vscode.env.language;
  reportedResult.systemInfo.platform = platformInfo.platform;
  reportedResult.systemInfo.shell = vscode.env.shell;
  reportedResult.systemInfo.vscodeVersion = vscode.version;
}
