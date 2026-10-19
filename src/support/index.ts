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

import { commands, env, ExtensionContext, l10n, Uri, window } from "vscode";
import { registerIDFCommand } from "../common/registerCommand";
import { withProgressWrapper } from "../common/withProgressWrapper";
import { initializeReportObject } from "./initReportObj";
import { generateConfigurationReport } from "./main";
import { Logger } from "../common/logger";
import {
  DOCTOR_FULL_FILE,
  DOCTOR_SUMMARY_FILE,
  writeTextReport,
} from "./writeReport";
import { TroubleshootingPanel } from "./troubleshootPanel";
import { ESP } from "../config";
import { isKnownError } from "../common/error/knownError";
import { reportObj } from "./types";

async function presentDoctorSummary(
  reportedResult: reportObj,
  context: ExtensionContext
): Promise<void> {
  const openFullReport = l10n.t("Open full report");
  const copyFullReport = l10n.t("Copy full report");
  const openInstallationManager = l10n.t("Open ESP-IDF Installation Manager");
  await env.clipboard.writeText(reportedResult.formatedOutput);
  await window.showTextDocument(
    Uri.joinPath(context.extensionUri, DOCTOR_SUMMARY_FILE)
  );
  const actions = [openFullReport, copyFullReport];
  if (reportedResult.reportSummary?.overall !== "PASS") {
    actions.push(openInstallationManager);
  }
  const choice = await window.showInformationMessage(
    l10n.t("ESP-IDF Doctor summary has been copied to clipboard."),
    ...actions
  );
  if (choice === openFullReport) {
    await window.showTextDocument(
      Uri.joinPath(context.extensionUri, DOCTOR_FULL_FILE)
    );
  } else if (choice === copyFullReport) {
    await env.clipboard.writeText(reportedResult.fullReport);
  } else if (choice === openInstallationManager) {
    await commands.executeCommand("espIdf.installManager");
  }
}

async function showDoctorReportOnError(
  error: unknown,
  reportedResult: reportObj,
  context: ExtensionContext
): Promise<void> {
  reportedResult.latestError = error as Error;
  const errMsg = error instanceof Error ? error.message : String(error);
  Logger.error(errMsg, error as Error, "extension DoctorCommand");
  await writeTextReport(reportedResult, context);
  await presentDoctorSummary(reportedResult, context);
}

export function registerDoctorCommand(context: ExtensionContext) {
  registerIDFCommand(context, "espIdf.doctorCommand", async () => {
    await withProgressWrapper(
      [],
      l10n.t("ESP-IDF Doctor"),
      async (progress, cancelToken) => {
        const reportedResult = initializeReportObject();
        try {
          await generateConfigurationReport(context, reportedResult, progress);
          await presentDoctorSummary(reportedResult, context);
        } catch (error) {
          await showDoctorReportOnError(error, reportedResult, context);
          if (!isKnownError(error)) {
            throw error;
          }
        }
      }
    );
  });

  registerIDFCommand(context, "espIdf.troubleshootPanel", async () => {
    const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
    TroubleshootingPanel.createOrShow(context, wsFolder.uri);
  });
}
