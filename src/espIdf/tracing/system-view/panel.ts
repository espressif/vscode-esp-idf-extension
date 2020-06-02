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
    const cssPath = this.panel.webview.asWebviewUri(
      Uri.file(join(this.extensionPath, "dist", "views", "sysView.bundle.css"))
    );
    this.panel.webview.html = `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>System View Trace</title>
  <link rel="stylesheet" href="${cssPath}">
</head>

<body>
  <section class="hero is-fullheight" id="loading">
    <div class="hero-body">
      <div class="container">
        <h1 class="title">
          System View Tracing
        </h1>
        <h2 class="subtitle">
          Please wait preparing your views, tables and timelines.
        </h2>
      </div>
    </div>
  </section>
  <div class="container" id="content">
    <br/>
    <p>Events Table</p>
    <div class="table-container" style="margin-bottom: 0em">
      <table class="table is-fullwidth is-hoverable is-striped">
        <thead>
          <tr>
            <th>ID</th><th>Timestamp</th><th>Core ID</th><th>Context</th><th>Events</th><th>Description</th>
          </tr>
        </thead>
        <tbody id="event_table_data"></tbody>
      </table>
    </div>
    <br/>
    <p>Timeline</p>
    <div id="plot"></div>
  </div>
  <script src="${scriptPath}"></script>
</body>

</html>`;
  }
}
