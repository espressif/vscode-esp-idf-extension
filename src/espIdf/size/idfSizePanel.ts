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
import {
  commands,
  Disposable,
  ExtensionContext,
  Uri,
  ViewColumn,
  Webview,
  WebviewPanel,
  window,
} from "vscode";
import { Logger } from "../../common/logger";
import { getWebViewFavicon } from "../../utils";
import type { IDFSizeCalculateResult } from "./types";
import { join } from "path";

export class IDFSizePanel {
  public static createOrShow(
    context: ExtensionContext,
    webviewData?: IDFSizeCalculateResult
  ) {
    const column = window.activeTextEditor
      ? window.activeTextEditor.viewColumn
      : undefined;
    if (IDFSizePanel.currentPanel) {
      IDFSizePanel.currentPanel._panel.reveal(column);
      return;
    }
    const panel = window.createWebviewPanel(
      IDFSizePanel.viewType,
      IDFSizePanel.viewTitle,
      column || ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [
          Uri.file(join(context.extensionPath, "dist", "views")),
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
      !!IDFSizePanel.currentPanel &&
      IDFSizePanel.currentPanel._panel.visible === false
    );
  }

  private static currentPanel: IDFSizePanel | undefined;
  private static readonly viewType = "idfSize";
  private static readonly viewTitle = "IDF-Size Analysis";

  private readonly _panel: WebviewPanel;
  private readonly _extensionPath: string;
  private _disposables: Disposable[] = [];
  private _webviewData: IDFSizeCalculateResult | undefined;

  private constructor(
    panel: WebviewPanel,
    extensionPath: string,
    webviewData?: IDFSizeCalculateResult
  ) {
    this._panel = panel;
    this._extensionPath = extensionPath;
    this._webviewData = webviewData;
    const isNewIdfSize: boolean = Boolean(webviewData?.overview?.version);
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
            commands.executeCommand("espIdf.flashDevice");
            break;
          case "requestInitialValues":
            if (this._webviewData) {
              this._panel.webview.postMessage({
                command: "initialLoad",
                ...this._webviewData,
              });
            }
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

  private getHtmlContent(webview: Webview, isNewIdfSize: boolean): string {
    const scriptPath = webview.asWebviewUri(
      Uri.file(
        join(
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
