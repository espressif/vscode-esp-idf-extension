/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 30th September 2026 1:52:00 pm
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

import { dirname, relative } from "path";
import { commands, l10n, Uri, window } from "vscode";
import { ensureDir, pathExists, readFile, stat, writeFile } from "fs-extra";
import { getWorkspaceFolder } from "../../support/getWorkspaceFolder";
import { extractFsFile } from "./parsers";
import { workspaceDestination } from "./savePath";
import { FsImageItem } from "./tree";
import { FsKind } from "./types";

export async function saveFsImageFile(
  item: FsImageItem | undefined,
  source: { imagePath?: string; kind?: FsKind }
): Promise<void> {
  if (!item || item.node.isDir) {
    window.showInformationMessage(
      l10n.t(
        "Right-click a file in the Filesystem Image Explorer to save it into the workspace."
      )
    );
    return;
  }
  const folder = getWorkspaceFolder();
  if (!folder) {
    window.showErrorMessage(
      l10n.t(
        "Open a workspace folder before saving a file from the filesystem image."
      )
    );
    return;
  }
  const destination = source.imagePath
    ? workspaceDestination(folder.uri.fsPath, source.imagePath, item.node.path)
    : undefined;
  if (!source.imagePath || !source.kind || !destination) {
    window.showErrorMessage(
      l10n.t("Could not read '{0}' from the filesystem image.", item.node.name)
    );
    return;
  }

  const savedAs = relative(folder.uri.fsPath, destination);
  if (await pathExists(destination)) {
    const info = await stat(destination);
    if (info.isDirectory()) {
      window.showErrorMessage(
        l10n.t(
          "'{0}' is a folder in the workspace, so the file was not saved.",
          savedAs
        )
      );
      return;
    }
    const replace = l10n.t("Replace");
    const choice = await window.showWarningMessage(
      l10n.t("'{0}' already exists in the workspace. Replace it?", savedAs),
      { modal: true },
      replace
    );
    if (choice !== replace) {
      return;
    }
  }

  const data = await readFile(source.imagePath);
  const bytes = await extractFsFile({
    data,
    imagePath: source.imagePath,
    kind: source.kind,
    virtualPath: item.node.path,
  });
  if (!bytes) {
    window.showErrorMessage(
      l10n.t("Could not read '{0}' from the filesystem image.", item.node.name)
    );
    return;
  }
  await ensureDir(dirname(destination));
  await writeFile(destination, bytes);

  const open = l10n.t("Open");
  const opened = await window.showInformationMessage(
    l10n.t("Saved {0} to the workspace.", savedAs),
    open
  );
  if (opened === open) {
    await commands.executeCommand("vscode.open", Uri.file(destination));
  }
}
