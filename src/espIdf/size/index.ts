/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 1st June 2026 4:10:32 pm
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

import { commands, ExtensionContext, l10n, window } from "vscode";
import { Logger } from "../../common/logger";
import { registerIDFCommand } from "../../common/registerCommand";
import { openFolderCheck } from "../../common/PreCheck";
import { withProgressWrapper } from "../../common/withProgressWrapper";
import { IDFSizePanel } from "./idfSizePanel";
import { IDFSize } from "./idfSize";

export function registerIdfSizeUICmd(context: ExtensionContext) {
  registerIDFCommand(context, "espIdf.size", async () => {
    await withProgressWrapper(
      [openFolderCheck],
      l10n.t("ESP-IDF: Size"),
      async (_progress, _cancelToken, workspaceRoot) => {
        try {
          if (IDFSizePanel.isCreatedAndHidden()) {
            IDFSizePanel.createOrShow(context);
            return;
          }
          const idfSize = new IDFSize(workspaceRoot.uri);
          _cancelToken.onCancellationRequested(idfSize.cancel);

          const results = await idfSize.calculateWithProgress(
            _progress,
            _cancelToken
          );
          if (!_cancelToken.isCancellationRequested) {
            IDFSizePanel.createOrShow(context, results);
          }
        } catch (error) {
          const msg: string =
            error instanceof Error ? error.message : JSON.stringify(error);
          if (
            msg.indexOf("project_description.json doesn't exist.") !== -1 ||
            msg.indexOf("Build is required for a size analysis") !== -1
          ) {
            const buildProject = await window.showInformationMessage(
              `ESP-IDF Size requires to build the project first. Build the project?`,
              "Build"
            );
            if (buildProject === "Build") {
              commands.executeCommand("espIdf.buildDevice");
            }
            Logger.error(
              msg,
              error as Error,
              "extension IDFSizePanel build files"
            );
            return;
          }
          Logger.errorNotify(
            msg,
            error as Error,
            "extension IDFSizePanel calculate"
          );
        }
      }
    );
  });
}
