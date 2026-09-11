/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 10th June 2026 4:22:56 pm
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
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

import { readdirSync, statSync } from "fs";
import { IdfComponentTreeItem } from "./IdfComponent";
import { l10n, TreeItemCollapsibleState, Uri } from "vscode";
import { join } from "path";

export function readComponentsDirs(filePath: string):   IdfComponentTreeItem[] {
  const filesOrFolders: IdfComponentTreeItem[] = [];

  const files = readdirSync(filePath);

  const openComponentMsg = l10n.t("ESP-IDF: Open IDF Component File");

  for (const file of files) {
    const stats = statSync(join(filePath, file));
    const isCollapsable: TreeItemCollapsibleState = stats.isDirectory()
      ? TreeItemCollapsibleState.Collapsed
      : TreeItemCollapsibleState.None;
    const idfCommand = stats.isDirectory()
      ? void 0
      : {
          arguments: [Uri.file(join(filePath, file))],
          command: "espIdf.openIdfDocument",
          title: openComponentMsg,
        };
    const component = new IdfComponentTreeItem(
      file,
      isCollapsable,
      Uri.file(join(filePath, file)),
      idfCommand
    );
    filesOrFolders.push(component);
  }

  return filesOrFolders;
}