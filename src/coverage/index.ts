/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 12th June 2026 6:37:43 pm
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
import { openFolderCheck, PreCheck } from "../common/PreCheck";
import { previewReport } from "./coverageService";
import { Logger } from "../common/logger";
import { OutputChannel } from "../common/outputChannel";
import { ESP } from "../config";
import { espIdfCoverageRenderer } from "./renderer";

export function registerCoverageCommands(context: ExtensionContext) {
  registerIDFCommand(context, "espIdf.genCoverage", () => {
      return PreCheck.perform([openFolderCheck], async () => {
        try {
          const covRenderer = espIdfCoverageRenderer.get();
          if (!covRenderer) {
            Logger.infoNotify(l10n.t("No workspace selected."));
            return;
          }
          await covRenderer.renderCoverage();
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : String(e);
          Logger.errorNotify(
            "Error building gcov data from gcda files.\nCheck the ESP-IDF output for more details.",
            e as Error,
            "extension genCoverage"
          );
          OutputChannel.appendLine(
            errMsg +
              "\nError building gcov data from gcda files.\n\n" +
              "Review the code coverage tutorial https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/additionalfeatures/coverage.html \n" +
              "or ESP-IDF documentation: https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/app_trace.html#gcov-source-code-coverage \n"
          );
        }
      });
    });
  
    registerIDFCommand(context, "espIdf.removeCoverage", () => {
      return PreCheck.perform([openFolderCheck], async () => {
        await espIdfCoverageRenderer.get()?.removeCoverage();
      });
    });
  
    registerIDFCommand(context, "espIdf.getCoverageReport", () => {
      return PreCheck.perform([openFolderCheck], async () => {
        const selected = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
        if (!selected) {
          Logger.infoNotify(l10n.t("No workspace selected."));
          return;
        }
        await previewReport(selected.uri);
      });
    });
}