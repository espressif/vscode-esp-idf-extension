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
import { ESP } from "../config";
import { espIdfCoverageRenderer } from "./renderer";
import { configureProjectWithGcov } from "./configureProject";
import { coverageCommandErrorMapping } from "./errorMapping";

function registerCoverageCommand(
  context: ExtensionContext,
  name: string,
  callback: (...args: any[]) => any
) {
  registerIDFCommand(context, name, callback, coverageCommandErrorMapping);
}

export function registerCoverageCommands(context: ExtensionContext) {
  registerCoverageCommand(context, "espIdf.genCoverage", () => {
    return PreCheck.perform([openFolderCheck], async () => {
      const covRenderer = espIdfCoverageRenderer.get();
      if (!covRenderer) {
        Logger.infoNotify(l10n.t("No workspace selected."));
        return;
      }
      await covRenderer.renderCoverage();
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
      await previewReport(context.extensionPath, selected.uri);
    });
  });

  registerCoverageCommand(context, "espIdf.setGcovConfig", async () => {
    await PreCheck.perform([openFolderCheck], async () => {
      const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
      await configureProjectWithGcov(context.extensionPath, wsFolder.uri);
    });
  });
}
