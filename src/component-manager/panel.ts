/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 6th January 2021 1:25:19 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
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

import { join } from "path";
import { Disposable, Uri, ViewColumn, WebviewPanel, window } from "vscode";
import { ESP } from "../config";
import { readParameter } from "../idfConfiguration";
import { addDependency } from "./utils";

export class ComponentManagerUIPanel {
  private static instance: ComponentManagerUIPanel;

  private readonly panel: WebviewPanel;
  private readonly workspaceRoot: Uri;
  private disposable: Disposable[] = [];
  private readonly extensionPath: string;

  public static show(extensionPath: string, workspaceRoot: Uri) {
    const column = window.activeTextEditor
      ? window.activeTextEditor.viewColumn
      : undefined;
    if (!!ComponentManagerUIPanel.instance) {
      ComponentManagerUIPanel.instance.panel.reveal(column);
    }
    const url = readParameter("esp.component-manager.url", workspaceRoot);
    if (!url) {
      throw new Error("esp.component-manager.url is not set");
    }
    const panel = window.createWebviewPanel(
      ESP.Webview.ComponentManagerUI.ViewType,
      ESP.Webview.ComponentManagerUI.Title,
      column || ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        enableCommandUris: true,
      }
    );
    ComponentManagerUIPanel.instance = new ComponentManagerUIPanel(
      panel,
      workspaceRoot,
      extensionPath,
      url
    );
  }

  public dispose() {
    ComponentManagerUIPanel.instance = null;
    this.panel.dispose();
    while (this.disposable.length) {
      const d = this.disposable.pop();
      d ? d.dispose() : null;
    }
  }

  private constructor(
    panel: WebviewPanel,
    workspaceRoot: Uri,
    extensionPath: string,
    url: string
  ) {
    this.panel = panel;
    this.workspaceRoot = workspaceRoot;
    this.extensionPath = extensionPath;
    this.panel.onDidDispose(() => this.dispose(), null, this.disposable);
    this.panel.webview.onDidReceiveMessage(
      async (message) => this.onMessage(message),
      null,
      this.disposable
    );
    this.panel.iconPath = Uri.file(
      join(extensionPath, "media", "espressif_icon.png")
    );
    this.panel.webview.html = this.initWebView(url);
  }
  private onMessage(message: any) {
    switch (message.message) {
      case "install":
        if (message.dependency) {
          const component = message.component || "main";
          addDependency(this.workspaceRoot, message.dependency, component);
        }
        break;
      default:
        break;
    }
  }
  private initWebView(url: string): string {
    return `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IDF Component Registry</title>
  <style>
    body {
      margin: 0px;
      padding: 0px;
      overflow: hidden;
    }

    iframe {
      overflow: hidden;
      overflow-x: hidden;
      overflow-y: hidden;
      height: 100%;
      width: 100%;
      position: absolute;
      top: 0px;
      left: 0px;
      right: 0px;
      bottom: 0px
    }
  </style>
</head>

<body>
  <iframe src="${url}" frameborder="0" width="100%" height="100%"></iframe>
  <script>
    const vscode = acquireVsCodeApi()
    window.addEventListener("message", (ev) => {
      vscode.postMessage(ev.data);
    })
  </script>
</body>

</html>`;
  }
}
