/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 30th December 2020 4:36:51 pm
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
import * as vscode from "vscode";
import { execChildProcess } from "./execChildProcess";
import { reportObj } from "./types";

const GIT_VERSION_REGEX = /(?:git\sversion\s)(\d+)(.\d+)?(.\d+)?(?:.windows.\d+)?/g;

export async function getGitVersion(
  reportedResult: reportObj,
  context: vscode.ExtensionContext,
) {
  const rawGitVersion = await execChildProcess(
    reportedResult.configurationSettings.gitPath,
    ["--version"],
    context.extensionPath
  );
  reportedResult.gitVersion.output = rawGitVersion;
  const versionMatches = rawGitVersion.match(GIT_VERSION_REGEX);
  if (versionMatches && versionMatches.length) {
    reportedResult.gitVersion.result = versionMatches[0].replace(
      /git\sversion\s/g,
      ""
    );
  } else {
    reportedResult.gitVersion.result = "Not found";
  }
}
