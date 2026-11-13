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
import { DOCTOR_SUMMARY_FILE, writeTextReport } from "./writeReport";
import { TroubleshootingPanel } from "./troubleshootPanel";
import { ESP } from "../config";
import { isKnownError } from "../common/error/knownError";
import { reportObj } from "./types";

async function presentDoctorSummary(
  reportedResult: reportObj,
  context: ExtensionContext
): Promise<void> {
  const openInstallationManager = l10n.t("Open ESP-IDF Installation Manager");
  await env.clipboard.writeText(reportedResult.formatedOutput);
  await window.showTextDocument(
    Uri.joinPath(context.extensionUri, DOCTOR_SUMMARY_FILE)
  );
  const actions: string[] = [];
  if (reportedResult.reportSummary?.overall === "FAIL") {
    actions.push(openInstallationManager);
  }
  void window
    .showInformationMessage(
      l10n.t("ESP-IDF Doctor report has been copied to clipboard."),
      ...actions
    )
    .then((choice) => {
      if (choice === openInstallationManager) {
        return commands.executeCommand("espIdf.installManager");
      }
      return undefined;
    });
}

async function writeDoctorReportOnError(
  error: unknown,
  reportedResult: reportObj,
  context: ExtensionContext
): Promise<void> {
  reportedResult.latestError = error as Error;
  const errMsg = error instanceof Error ? error.message : String(error);
  const rethrow = !isKnownError(error);
  Logger.error(
    errMsg,
    error as Error,
    "extension DoctorCommand",
    undefined,
    !rethrow
  );
  await writeTextReport(reportedResult, context);
}

let doctorReportRegistered = false;
let troubleshootPanelRegistered = false;

export function registerDoctorReportCommand(context: ExtensionContext) {
  if (doctorReportRegistered) {
    return;
  }
  doctorReportRegistered = true;
  registerIDFCommand(context, "espIdf.doctorCommand", async () => {
    const reportedResult = initializeReportObject();
    let reportReady = false;
    let errorToRethrow: unknown;
    await withProgressWrapper(
      [],
      l10n.t("ESP-IDF Doctor"),
      async (progress) => {
        try {
          await generateConfigurationReport(context, reportedResult, progress);
          reportReady = true;
        } catch (error) {
          await writeDoctorReportOnError(error, reportedResult, context);
          reportReady = true;
          if (!isKnownError(error)) {
            errorToRethrow = error;
          }
        }
      }
    );
    if (reportReady) {
      await presentDoctorSummary(reportedResult, context);
    }
    if (errorToRethrow) {
      throw errorToRethrow;
    }
  });
}

export function registerTroubleshootPanelCommand(context: ExtensionContext) {
  if (troubleshootPanelRegistered) {
    return;
  }
  troubleshootPanelRegistered = true;
  registerIDFCommand(context, "espIdf.troubleshootPanel", async () => {
    const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
    TroubleshootingPanel.createOrShow(context, wsFolder.uri);
  });
}

export function registerDoctorCommand(context: ExtensionContext) {
  registerDoctorReportCommand(context);
  registerTroubleshootPanelCommand(context);
}
