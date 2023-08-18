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

import { basename } from "path";
import { Uri, window, workspace } from "vscode";

export async function getFileList(): Promise<Uri[]> {
  let files: Uri[] = [];
  try {
    files = await workspace.findFiles("**/test/test_*.c");
  } catch (err) {
    window.showErrorMessage("Cannot find test result path!", err);
    return [];
  }
  return files;
}

export async function getTestComponents(files: Uri[]): Promise<string[]> {
  let componentsList: Set<string> = new Set<string>();
  files.forEach((match) => {
    const componentName = basename(match.fsPath.split("/test/test_")[0]);
    componentsList.add(componentName);
  });
  return Array.from(componentsList);
}