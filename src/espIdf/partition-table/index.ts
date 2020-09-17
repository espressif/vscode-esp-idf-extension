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

export class PartitionTableEditorPanel {
  private static instance: PartitionTableEditorPanel;

  private readonly panel: WebviewPanel;
  private disposable: Disposable[] = [];
  private readonly extensionPath: string;

  public static show(extensionPath: string, filePath: string) {
    const column = window.activeTextEditor
      ? window.activeTextEditor.viewColumn
      : undefined;
    if (!!this.instance) {
      return this.instance.panel.reveal(column);
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
    this.instance = new PartitionTableEditorPanel(panel, extensionPath);
  }

  public dispose() {
    PartitionTableEditorPanel.instance = null;
    this.panel.dispose();
    while (this.disposable.length) {
      const d = this.disposable.pop();
      d ? d.dispose() : null;
    }
  }

  private constructor(panel: WebviewPanel, extensionPath: string) {
    this.panel = panel;
    this.extensionPath = extensionPath;
    this.panel.onDidDispose(() => this.dispose(), null, this.disposable);
    this.panel.webview.onDidReceiveMessage(
      this.onMessage,
      null,
      this.disposable
    );
    this.panel.iconPath = Uri.file(
      join(extensionPath, "media", "espressif_icon.png")
    );
    this.panel.webview.html = this.initWebView(this.panel.webview);
  }
  private onMessage(message: any) {}
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
