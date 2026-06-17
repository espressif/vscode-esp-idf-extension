/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 17th June 2026 2:45:48 pm
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
import { registerIDFCommand } from "../common/registerCommand";
import { withProgressWrapper } from "../common/withProgressWrapper";
import { ESPEFuseManager } from "./manager";
import { openFolderCheck } from "../common/PreCheck";
import { Logger } from "../common/logger";
import { ESP } from "../config";
import { ESPEFuseTreeDataProvider } from "./view";

export function registerEfuseCommands(context: ExtensionContext) {
  let eFuseExplorer: ESPEFuseTreeDataProvider = new ESPEFuseTreeDataProvider();
  context.subscriptions.push(
    eFuseExplorer.registerDataProviderForTree("espEFuseExplorer")
  );
  registerIDFCommand(context, "esp.efuse.summary", async () => {
    await withProgressWrapper(
      [openFolderCheck],
      l10n.t("ESP-IDF: Getting eFuse summary for your chip"),
      async (_progress, _cancelToken) => {
        try {
          const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
          const eFuse = new ESPEFuseManager(wsFolder.uri);
          const resp = await eFuse.summary();
          eFuseExplorer.load(resp);
          eFuseExplorer.refresh();
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          if (
            error instanceof Error &&
            error.name === "IDF_VERSION_MIN_REQUIREMENT_ERROR"
          ) {
            return Logger.errorNotify(errMsg, error as Error, "efuse summary");
          }
          Logger.errorNotify(
            l10n.t(
              "Failed to get the eFuse Summary from the chip, please make sure you have selected a valid port"
            ),
            error as Error,
            "efuse summary"
          );
        }
      }
    );
  });

  registerIDFCommand(context, "espIdf.efuse.clearResults", async () => {
    eFuseExplorer.clearResults();
  });
}
