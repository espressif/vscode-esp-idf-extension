/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 9th September 2020 1:19:26 pm
 * Copyright 2020 Espressif Systems (Shanghai) CO LTD
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

import {
  WebviewPanel,
  window,
  ViewColumn,
  Uri,
  Disposable,
  Webview,
  env,
} from "vscode";
import { PartitionEditorMetadata } from "./flashMetadata";
import { join } from "path";
import { ESP } from "../../config";
import { writeFile } from "fs-extra";
import { Logger } from "../../common/logger";
import { readFileSync } from "fs";

export class PartitionTableEditorPanel {
  private static instance: PartitionTableEditorPanel | undefined;

  private readonly panel: WebviewPanel;
  private disposable: Disposable[] = [];
  private readonly extensionPath: string;

  private filePath: string;
  private metadata: PartitionEditorMetadata;

  public static show(
    extensionPath: string,
    filePath: string,
    metadata: PartitionEditorMetadata
  ) {
    const column = window.activeTextEditor
      ? window.activeTextEditor.viewColumn
      : undefined;
    if (!!PartitionTableEditorPanel.instance) {
      PartitionTableEditorPanel.instance.metadata = metadata;
      if (PartitionTableEditorPanel.instance.filePath === filePath) {
        PartitionTableEditorPanel.instance.panel.reveal(column);
      } else {
        PartitionTableEditorPanel.instance.filePath = filePath;
      }
      PartitionTableEditorPanel.instance.getCSVFrom(filePath).then((csv) => {
        if (!PartitionTableEditorPanel.instance) {
          return;
        }
        PartitionTableEditorPanel.instance.initDataToWebview(csv);
      });
      return;
    }
    const panel = window.createWebviewPanel(
      ESP.Webview.PartitionTableEditor.ViewType,
      ESP.Webview.PartitionTableEditor.Title,
      column || ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [Uri.file(join(extensionPath, "dist", "views"))],
        enableCommandUris: true,
      }
    );
    PartitionTableEditorPanel.instance = new PartitionTableEditorPanel(
      panel,
      extensionPath,
      filePath,
      metadata
    );
  }

  public dispose() {
    PartitionTableEditorPanel.instance = undefined;
    this.panel.dispose();
    while (this.disposable.length) {
      const d = this.disposable.pop();
      d ? d.dispose() : null;
    }
  }

  private constructor(
    panel: WebviewPanel,
    extensionPath: string,
    filePath: string,
    metadata: PartitionEditorMetadata
  ) {
    this.panel = panel;
    this.extensionPath = extensionPath;
    this.filePath = filePath;
    this.metadata = metadata;
    this.panel.onDidDispose(() => this.dispose(), null, this.disposable);
    this.panel.webview.onDidReceiveMessage(
      (e) => this.onMessage(e),
      null,
      this.disposable
    );
    this.panel.iconPath = Uri.file(
      join(extensionPath, "media", "espressif_icon.png")
    );
    this.panel.webview.html = this.initWebView(this.panel.webview);
    this.getCSVFrom(this.filePath).then((csv) => {
      this.initDataToWebview(csv);
    });
  }
  private async getCSVFrom(filepath: string): Promise<string> {
    if (filepath.endsWith("csv")) {
      return readFileSync(filepath, "utf-8");
    }
    return "";
  }
  private writeCSVDataToFile(filePath: string, csv: string) {
    if (filePath.endsWith("csv")) {
      writeFile(filePath, csv, (err) => {
        if (err) {
          return Logger.errorNotify(
            `Failed to save the partition data to the file ${filePath} due to some error. Error: ${err.message}`,
            err,
            "PartitionTableEditorPanel writeCSVDataToFile",
            undefined,
            false
          );
        }
        Logger.infoNotify(
          `Partition table is saved successfully. (${filePath})`
        );
      });
    }
  }
  private initDataToWebview(csv: string) {
    this.sendMessageToWebView("loadInitialData", {
      csv,
      flashSizeBytes: this.metadata.flashSizeBytes,
      partitionTableOffset: this.metadata.partitionTableOffset,
    });
  }
  private sendMessageToWebView(command: string, payload: object) {
    if (this.panel && this.panel.webview) {
      this.panel.webview.postMessage({ command, ...payload });
    }
  }
  private onMessage(message: any) {
    switch (message.command) {
      case "initDataRequest":
        this.getCSVFrom(this.filePath).then((csv) => {
          this.initDataToWebview(csv);
        });
        break;
      case "saveDataRequest":
        if (message.csv) {
          this.writeCSVDataToFile(this.filePath, message.csv);
        }
        break;
      case "showErrorMessage":
        if (message.error) {
          Logger.errorNotify(
            message.error,
            new Error(message.error),
            "PartitionTableEditorPanel showErrorMessage",
            undefined,
            false
          );
        }
        break;
      case "copyCsv":
        if (typeof message.csv === "string") {
          void env.clipboard.writeText(message.csv).then(
            () => {
              Logger.infoNotify("Partition table CSV copied to the clipboard.");
            },
            (error: unknown) => {
              const err = error instanceof Error ? error : new Error(String(error));
              Logger.error(
                "Failed to copy the partition table CSV to the clipboard.",
                err,
                "PartitionTableEditorPanel copyCsv",
                undefined,
                false
              );
            }
          );
        }
        break;
      case "pasteCsv":
        void env.clipboard.readText().then(
          (csv) => {
            this.sendMessageToWebView("pasteCsvData", { csv });
          },
          (error: unknown) => {
            const err = error instanceof Error ? error : new Error(String(error));
            Logger.error(
              "Failed to read a partition table CSV from the clipboard.",
              err,
              "PartitionTableEditorPanel pasteCsv",
              undefined,
              false
            );
          }
        );
        break;
      default:
        break;
    }
  }
  private initWebView(webview: Webview): string {
    const scriptPath = webview.asWebviewUri(
      Uri.file(
        join(this.extensionPath, "dist", "views", "partition_table-bundle.js")
      )
    );
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Partition Table</title>
    </head>
    <body>
      <section id="app"></section>
      <script src="${scriptPath}"></script>
    </body>
    </html>`;
  }
}
