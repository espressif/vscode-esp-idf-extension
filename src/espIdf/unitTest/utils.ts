/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 18th August 2023 5:42:23 pm
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

import { basename, sep } from "path";
import { RelativePattern, Uri, window, workspace } from "vscode";
import { readParameter } from "../../idfConfiguration";
import { ESP } from "../../config";

export async function getFileList(): Promise<Uri[]> {
  let files: Uri[] = [];
  try {
    let workspaceFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
    if (!workspaceFolder) {
      workspaceFolder = workspace.workspaceFolders
        ? workspace.workspaceFolders[0]
        : undefined;
    }
    if (!workspaceFolder) {
      window.showErrorMessage(
        "Cannot find workspace folder for the selected path!"
      );
      return [];
    }
    const filePattern =
      readParameter("idf.unitTestFilePattern", workspaceFolder?.uri) ||
      "**/test/test_*.c";
    const relativePattern = new RelativePattern(workspaceFolder, filePattern);
    files = await workspace.findFiles(relativePattern);
  } catch (err) {
    const errMsg =
      err instanceof Error
        ? err.message
        : "An error occurred while searching for test files.";
    window.showErrorMessage("Cannot find test result path!", errMsg);
    return [];
  }
  return files;
}

export async function getTestComponents(files: Uri[]): Promise<string[]> {
  let componentsList: Set<string> = new Set<string>();
  files.forEach((match) => {
    const componentName = basename(
      match.fsPath.split(sep + "test" + sep + "test_")[0]
    );
    componentsList.add(componentName);
  });
  return Array.from(componentsList);
}
