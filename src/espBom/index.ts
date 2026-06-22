/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 18th June 2026 2:59:57 pm
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
import { ESP } from "../config";
import { registerIDFCommand } from "../common/registerCommand";
import { withProgressWrapper } from "../common/withProgressWrapper";
import { openFolderCheck } from "../common/PreCheck";
import { createSBOM, installEspSBOM } from "./main";
import { Logger } from "../common/logger";

export function registerEspBomCommands(context: ExtensionContext) {
  registerIDFCommand(context, "espIdf.createSbom", async () => {
    await withProgressWrapper(
      [openFolderCheck],
      l10n.t("ESP-IDF: Create SBOM summary"),
      async (_progress, cancelToken) => {
        try {
          const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
          await installEspSBOM(wsFolder.uri);
          await createSBOM(wsFolder.uri);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          return Logger.errorNotify(errorMessage, err as Error, "sbom");
        }
      }
    );
  });
}
