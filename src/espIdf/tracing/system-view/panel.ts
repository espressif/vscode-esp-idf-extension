/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 28th May 2020 7:19:22 pm
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
import { WebviewPanel, window, ViewColumn, Uri, Disposable } from "vscode";
import { join } from "path";
import { getWebViewFavicon } from "../../../utils";
export class SystemViewPanel {
  private static instance: SystemViewPanel;
  private readonly panel: WebviewPanel;
  private disposable: Disposable[] = [];
  private readonly extensionPath: string;
  private readonly traceData: any;
  public static show(extensionPath: string, traceData: any) {
    const column = window.activeTextEditor
      ? window.activeTextEditor.viewColumn
      : undefined;
    if (!!this.instance) {
      return this.instance.panel.reveal(column);
    }
    const panel = window.createWebviewPanel(
      "system-view",
      "ESP System View Report",
      column || ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [Uri.file(join(extensionPath, "dist", "views"))],
      }
    );
    this.instance = new SystemViewPanel(panel, extensionPath, traceData);
  }

  public dispose() {
    SystemViewPanel.instance = null;
    this.panel.dispose();
    while (this.disposable.length) {
      const d = this.disposable.pop();
      d ? d.dispose() : null;
    }
  }

  private constructor(
    panel: WebviewPanel,
    extensionPath: string,
    traceData: any
  ) {
    this.panel = panel;
    this.extensionPath = extensionPath;
    this.traceData = traceData;
    this.panel.onDidDispose(() => this.dispose(), null, this.disposable);
    this.panel.webview.onDidReceiveMessage(
      this.onMessage,
      null,
      this.disposable
    );
    this.panel.iconPath = getWebViewFavicon(extensionPath);
    this.initWebView();
    setTimeout(() => {
      this.sendCommandToWebview("initialLoad", this.traceData);
    }, 800);
  }
  private onMessage(message: any) {}
  private sendCommandToWebview(command: string, value: any) {
    if (this.panel.webview) {
      this.panel.webview.postMessage({
        command,
        value,
      });
    }
  }
  private initWebView() {
    const scriptPath = this.panel.webview.asWebviewUri(
      Uri.file(join(this.extensionPath, "dist", "views", "sysView-bundle.js"))
    );
    const fontsUri = this.panel.webview.asWebviewUri(
      Uri.file(
        join(this.extensionPath, "dist", "views", "fonts", "codicon.ttf")
      )
    );
    this.panel.webview.html = `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>System View Trace</title>
    </head>
    <body>
      <style>
      @font-face {
          font-family: "codicon";
          src: url('${fontsUri}') format('truetype');
      }
      </style>
      <section id="app"></section>
      <script src="${scriptPath}"></script>
    </body>
    </html>`;
  }
}
