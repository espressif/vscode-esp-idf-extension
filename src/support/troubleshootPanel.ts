/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 14th June 2024 5:13:57 pm
 * Copyright 2024 Espressif Systems (Shanghai) CO LTD
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
import { join } from "path";
import {
  Disposable,
  ExtensionContext,
  Progress,
  ProgressLocation,
  Uri,
  ViewColumn,
  WebviewPanel,
  env,
  l10n,
  window,
} from "vscode";
import { NotificationMode, readParameter } from "../idfConfiguration";
import { initializeReportObject } from "./initReportObj";
import { generateConfigurationReport } from ".";
import { Logger } from "../logger/logger";
import { writeTextReport } from "./writeReport";
import { EOL } from "os";
import { Telemetry } from "../telemetry";

export class TroubleshootingPanel {
  public static currentPanel: TroubleshootingPanel | undefined;

  public static createOrShow(context: ExtensionContext, workspace: Uri) {
    const column = window.activeTextEditor
      ? window.activeTextEditor.viewColumn
      : ViewColumn.One;
    if (TroubleshootingPanel.currentPanel) {
      TroubleshootingPanel.currentPanel.panel.reveal(column);
    } else {
      TroubleshootingPanel.currentPanel = new TroubleshootingPanel(
        workspace,
        context,
        column
      );
    }
  }

  public static isCreatedAndHidden() {
    return (
      TroubleshootingPanel.currentPanel &&
      TroubleshootingPanel.currentPanel.panel.visible === false
    );
  }

  private static readonly viewType = "TroubleshootingPanel";
  private readonly panel: WebviewPanel;
  private disposables: Disposable[] = [];

  constructor(workspace: Uri, context: ExtensionContext, column: ViewColumn) {
    const welcomePanelTitle = l10n.t("ESP-IDF Troubleshooting Form");

    this.panel = window.createWebviewPanel(
      TroubleshootingPanel.viewType,
      welcomePanelTitle,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          Uri.file(join(context.extensionPath, "dist", "views")),
        ],
      }
    );

    this.panel.iconPath = Uri.file(
      join(context.extensionPath, "media", "espressif_icon.png")
    );

    const scriptPath = this.panel.webview.asWebviewUri(
      Uri.file(
        join(context.extensionPath, "dist", "views", "troubleshoot-bundle.js")
      )
    );

    this.panel.webview.html = this.createTroubleshootPageHtml(scriptPath);

    this.panel.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.command) {
        case "sendForm":
          if (msg.title && msg.stepsToReproduce && msg.description) {
            await this.createTroubleshootingReport(
              msg.title,
              msg.description,
              msg.stepsToReproduce,
              workspace,
              context
            );
          }
          break;
        default:
          break;
      }
    });

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  private async createTroubleshootingReport(
    title: string,
    description: string,
    stepsToReproduce: string,
    workspace: Uri,
    context: ExtensionContext
  ) {
    let troubleshootOutput = `---------------------------------------------- ESP-IDF Troubleshoot report -----------------------------------------------------------------${EOL}`;
    const lineBreak = `--------------------------------------------------------------------------------------------------------------------------------------------${EOL}`;
    troubleshootOutput += `Title: ${title} ${EOL}`;
    troubleshootOutput += lineBreak;
    troubleshootOutput += `Description:${EOL} ${description} ${EOL}`;
    troubleshootOutput += lineBreak;
    troubleshootOutput += `Steps to Reproduce:${EOL} ${stepsToReproduce} ${EOL}`;
    const notificationMode = readParameter(
      "idf.notificationMode",
      workspace
    ) as string;
    const progressLoc =
      notificationMode === NotificationMode.All ||
      notificationMode === NotificationMode.Notifications
        ? ProgressLocation.Notification
        : ProgressLocation.Window;
    await window.withProgress(
      {
        cancellable: false,
        location: progressLoc,
        title: l10n.t("ESP-IDF Doctor"),
      },
      async (progress: Progress<{ message: string; increment: number }>) => {
        const reportedResult = initializeReportObject();
        try {
          await generateConfigurationReport(context, workspace, reportedResult, progress);
          const reportOutput = await writeTextReport(reportedResult, context);
          troubleshootOutput += reportOutput;
          await env.clipboard.writeText(troubleshootOutput);
          Telemetry.sendEvent("UserTroubleshootReport", {
            title,
            description,
            stepsToReproduce,
            report: reportOutput,
          });
          Logger.infoNotify(
            l10n.t("ESP-IDF Troubleshoot Report has been generated.")
          );
        } catch (error) {
          reportedResult.latestError = error;
          const errMsg = error.message
            ? error.message
            : "Configuration report error";
          Logger.error(errMsg, error, "TroubleshootingPanel createTroubleshootingReport");
          Logger.warnNotify(
            l10n.t(
              "Extension configuration report has been copied to clipboard with errors"
            )
          );
          const reportOutput = await writeTextReport(reportedResult, context);
          troubleshootOutput += reportOutput;
          await env.clipboard.writeText(troubleshootOutput);
          Telemetry.sendEvent("UserTroubleshootReport", {
            title,
            description,
            stepsToReproduce,
            report: reportOutput,
          });
        }
      }
    );
  }

  private createTroubleshootPageHtml(scriptsPath: Uri): string {
    return `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>ESP-IDF Troubleshoot Form</title>
        </head>
        <body>
          <div id="app"></div>
        </body>
        <script src="${scriptsPath}"></script>
      </html>`;
  }

  public dispose() {
    TroubleshootingPanel.currentPanel = undefined;
    this.panel.dispose();
  }
}
