/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 17th June 2026 3:46:17 pm
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

import { env, ExtensionContext, l10n, Uri, window } from "vscode";
import { registerIDFCommand } from "../common/registerCommand";
import { withProgressWrapper } from "../common/withProgressWrapper";
import { join } from "path";
import { initializeReportObject } from "./initReportObj";
import { generateConfigurationReport } from "./main";
import { Logger } from "../common/logger";
import { writeTextReport } from "./writeReport";
import { TroubleshootingPanel } from "./troubleshootPanel";
import { ESP } from "../config";

export function registerDoctorCommand(context: ExtensionContext) {
  registerIDFCommand(context, "espIdf.doctorCommand", async () => {
    await withProgressWrapper(
      [],
      l10n.t("ESP-IDF Doctor"),
      async (progress, cancelToken) => {
        const reportedResult = initializeReportObject();
        try {
          await generateConfigurationReport(
            context,
            reportedResult,
            progress
          );
          await window.showTextDocument(
            Uri.joinPath(context.extensionUri, "report.txt")
          );
        } catch (error) {
          reportedResult.latestError = error as Error;
          const errMsg = error instanceof Error ? error.message : String(error);
          Logger.error(errMsg, error as Error, "extension DoctorCommand");
          Logger.warnNotify(
            l10n.t(
              "Extension configuration report has been copied to clipboard with errors"
            )
          );
          const reportOutput = await writeTextReport(reportedResult, context);
          await env.clipboard.writeText(reportOutput);
          await window.showTextDocument(
            Uri.file(join(context.extensionPath, "report.txt"))
          );
          return reportedResult;
        }
      }
    );
  });

  registerIDFCommand(context, "espIdf.troubleshootPanel", async () => {
    const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
    TroubleshootingPanel.createOrShow(context, wsFolder.uri);
  });
}
