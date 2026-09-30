/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 1st September 2026 3:31:00 pm
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

import { commands, ExtensionContext, Uri, window } from "vscode";
import { pathExists } from "fs-extra";
import { registerIDFCommand } from "../../common/registerCommand";
import { fileNotFound } from "../../common/error/knownError";
import { FsImageItem, FsImageTreeDataProvider } from "./tree";
import { saveFsImageFile } from "./saveFile";

let provider: FsImageTreeDataProvider | undefined;

export function registerFsImageCommands(context: ExtensionContext): void {
  provider = new FsImageTreeDataProvider();
  const treeView = window.createTreeView("idfFsImageExplorer", {
    treeDataProvider: provider,
    showCollapseAll: true,
  });
  provider.attachTreeView(treeView);
  context.subscriptions.push(treeView);

  registerIDFCommand(
    context,
    "espIdf.fsImage.explore",
    async (binPath?: Uri) => {
      let target = binPath;
      if (!target) {
        const picked = await window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          filters: { Binaries: ["bin"] },
        });
        if (!picked || picked.length === 0) {
          return;
        }
        target = picked[0];
      }
      await loadFsImage(target.fsPath);
    },
    { outputChannel: "Filesystem Image" }
  );

  registerIDFCommand(
    context,
    "espIdf.fsImage.refresh",
    async () => {
      if (!provider?.currentImagePath) {
        return;
      }
      await provider.refresh();
    },
    { outputChannel: "Filesystem Image" }
  );

  registerIDFCommand(
    context,
    "espIdf.fsImage.saveFile",
    async (item?: FsImageItem) => {
      await saveFsImageFile(item, {
        imagePath: provider?.currentImagePath,
        kind: provider?.currentKind,
      });
    },
    { outputChannel: "Filesystem Image" }
  );
}

export async function loadFsImage(
  imagePath: string,
  subtypeHint?: string
): Promise<void> {
  if (!(await pathExists(imagePath))) {
    throw fileNotFound(imagePath);
  }
  if (!provider) {
    return;
  }
  await provider.load(imagePath, subtypeHint);
  await commands.executeCommand("idfFsImageExplorer.focus");
}
