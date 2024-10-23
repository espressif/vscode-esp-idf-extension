/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 20th June 2019 10:39:58 am
 * Copyright 2019 Espressif Systems (Shanghai) CO LTD
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
import * as path from "path";
import * as vscode from "vscode";
import { Logger } from "../../logger/logger";
import { getWebViewFavicon } from "../../utils";

export class IDFSizePanel {
  public static createOrShow(
    context: vscode.ExtensionContext,
    webviewData?: object
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;
    if (IDFSizePanel.currentPanel) {
      IDFSizePanel.currentPanel._panel.reveal(column);
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      IDFSizePanel.viewType,
      IDFSizePanel.viewTitle,
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(context.extensionPath, "dist", "views")),
        ],
        retainContextWhenHidden: true,
      }
    );
    IDFSizePanel.currentPanel = new IDFSizePanel(
      panel,
      context.extensionPath,
      webviewData
    );
  }

  public static isCreatedAndHidden(): boolean {
    return (
      IDFSizePanel.currentPanel &&
      IDFSizePanel.currentPanel._panel.visible === false
    );
  }

  private static currentPanel: IDFSizePanel | undefined;
  private static readonly viewType = "idfSize";
  private static readonly viewTitle = "IDF-Size Analysis";

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionPath: string;
  private _disposables: vscode.Disposable[] = [];
  private _webviewData: object;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionPath: string,
    webviewData: object
  ) {
    this._panel = panel;
    this._extensionPath = extensionPath;
    this._webviewData = webviewData;
    const isNewIdfSize: boolean =
      webviewData["overview"] && webviewData["overview"].version;
    this.initWebview(isNewIdfSize);
  }
  private disposeWebview() {
    IDFSizePanel.currentPanel = undefined;
  }
  private initWebview(isNewIdfSize: boolean) {
    this._panel.iconPath = getWebViewFavicon(this._extensionPath);
    this._panel.webview.html = this.getHtmlContent(
      this._panel.webview,
      isNewIdfSize
    );
    this._panel.onDidDispose(this.disposeWebview, null, this._disposables);
    this._panel.webview.onDidReceiveMessage(
      (msg) => {
        switch (msg.command) {
          case "flash":
            vscode.commands.executeCommand("espIdf.flashDevice");
            break;
          case "requestInitialValues":
            this._panel.webview.postMessage({
              command: "initialLoad",
              ...this._webviewData,
            });
            break;
          default:
            const err = new Error(
              `Unrecognized command received from webview (idf-size), file: ${__filename}`
            );
            Logger.error(err.message, err, "IDFSizePanel unrecognized command");
            break;
        }
      },
      null,
      this._disposables
    );
  }

  private getHtmlContent(
    webview: vscode.Webview,
    isNewIdfSize: boolean
  ): string {
    const scriptPath = webview.asWebviewUri(
      vscode.Uri.file(
        path.join(
          this._extensionPath,
          "dist",
          "views",
          isNewIdfSize ? "newSize-bundle.js" : "size-bundle.js"
        )
      )
    );
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>ESP-IDF Size Analysis</title>
    </head>
    <body>
      <section id="app"></section>
      <script src="${scriptPath}"></script>
    </body>
    </html>`;
  }
}
