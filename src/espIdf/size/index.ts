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

import { ExtensionContext, l10n } from "vscode";
import { registerIDFCommand } from "../../common/registerCommand";
import { openFolderCheck } from "../../common/PreCheck";
import { withProgressWrapper } from "../../common/withProgressWrapper";
import { IDFSizePanel } from "./idfSizePanel";
import { IDFSize } from "./idfSize";
import { ESP } from "../../config";
import { sizeCommandErrorMapping } from "./errorMapping";

export function registerIdfSizeUICmd(context: ExtensionContext) {
  registerIDFCommand(
    context,
    "espIdf.size",
    async () => {
      await withProgressWrapper(
        [openFolderCheck],
        l10n.t("ESP-IDF: Size"),
        async (_progress, _cancelToken) => {
          if (IDFSizePanel.isCreatedAndHidden()) {
            IDFSizePanel.createOrShow(context);
            return;
          }
          const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
          const idfSize = new IDFSize(wsFolder.uri);
          _cancelToken.onCancellationRequested(idfSize.cancel);

          const results = await idfSize.calculateWithProgress(
            _progress,
            _cancelToken
          );
          if (results && !_cancelToken.isCancellationRequested) {
            IDFSizePanel.createOrShow(context, results);
          }
        }
      );
    },
    sizeCommandErrorMapping
  );
}
