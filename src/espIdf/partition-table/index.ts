/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 9th September 2020 1:19:26 pm
 * Copyright 2020 Espressif Systems (Shanghai) CO LTD
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
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
} from "vscode";
import { join } from "path";
import { ESP } from "../../config";
import { readFileSync } from "../../utils";
import { writeFile } from "fs-extra";
import { Logger } from "../../logger/logger";
import { file } from "tmp";

export class PartitionTableEditorPanel {
  private static instance: PartitionTableEditorPanel;

  private readonly panel: WebviewPanel;
  private disposable: Disposable[] = [];
  private readonly extensionPath: string;

  private filePath: string;

  public static show(extensionPath: string, filePath: string) {
    const column = window.activeTextEditor
      ? window.activeTextEditor.viewColumn
      : undefined;
    if (!!this.instance) {
      if (this.instance.filePath === filePath) {
        return this.instance.panel.reveal(column);
      }
      // new filepath so update the
      this.instance.getCSVFrom(filePath).then((csv) => {
        this.instance.initDataToWebview(csv);
      });
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
        enableFindWidget: true,
      }
    );
    this.instance = new PartitionTableEditorPanel(
      panel,
      extensionPath,
      filePath
    );
  }

  public dispose() {
    PartitionTableEditorPanel.instance = null;
    this.panel.dispose();
    while (this.disposable.length) {
      const d = this.disposable.pop();
      d ? d.dispose() : null;
    }
  }

  private constructor(
    panel: WebviewPanel,
    extensionPath: string,
    filePath: string
  ) {
    this.panel = panel;
    this.extensionPath = extensionPath;
    this.filePath = filePath;
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
      return readFileSync(filepath);
    }
    return "";
  }
  private writeCSVDataToFile(filePath: string, csv: string) {
    if (filePath.endsWith("csv")) {
      writeFile(filePath, csv, (err) => {
        if (err) {
          return Logger.errorNotify(
            `Failed to save the partition data to the file ${filePath} due to some error. Error: ${err.message}`,
            err
          );
        }
        Logger.infoNotify(
          `Partition table is saved successfully. (${filePath})`
        );
      });
    }
  }
  private initDataToWebview(csv: string) {
    this.sendMessageToWebView("loadInitialData", { csv });
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
          Logger.errorNotify(message.error, new Error(message.error));
        }
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
      <title>ESP-IDF Partition Table Editor</title>
    </head>
    <body>
      <section id="app"></section>
      <script src="${scriptPath}"></script>
    </body>
    </html>`;
  }
}
