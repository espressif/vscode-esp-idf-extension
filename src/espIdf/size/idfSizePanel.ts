/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 20th June 2019 10:39:58 am
 * Copyright 2019 Espressif Systems (Shanghai) CO LTD
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

// tslint:disable: variable-name
import * as fs from "fs";
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
    this.initWebview();
  }
  private disposeWebview() {
    IDFSizePanel.currentPanel = undefined;
  }
  private initWebview() {
    this._panel.iconPath = getWebViewFavicon(this._extensionPath);
    this._panel.webview.html = this.getHtmlContent();
    this._panel.webview.postMessage(this._webviewData);
    this._panel.onDidDispose(this.disposeWebview, null, this._disposables);
    this._panel.webview.onDidReceiveMessage(
      (msg) => {
        switch (msg.command) {
          case "flash":
            vscode.commands.executeCommand("espIdf.flashDevice");
            break;
          case "retry":
            this._panel.webview.postMessage(this._webviewData);
            break;
          default:
            const err = new Error(
              `Unrecognized command received from webview (idf-size), file: ${__filename}`
            );
            Logger.error(err.message, err);
            break;
        }
      },
      null,
      this._disposables
    );
  }
  private getHtmlContent(): string {
    const htmlFilePath = path.join(
      this._extensionPath,
      "dist",
      "views",
      "size.html"
    );
    if (!fs.existsSync(htmlFilePath)) {
      return this.notFoundStaticHtml();
    }
    let html = fs.readFileSync(htmlFilePath).toString();
    const fileUrl = this._panel.webview.asWebviewUri(
      vscode.Uri.file(htmlFilePath)
    );
    const fontsPath = this._panel.webview.asWebviewUri(
      vscode.Uri.file(
        path.join(this._extensionPath, "dist", "views", "fonts", "codicon.ttf")
      )
    );
    if (/(<head(\s.*)?>)/.test(html)) {
      html = html.replace(
        /(<head(\s.*)?>)/,
        `$1<base href="${fileUrl.toString()}">`
      );
    } else if (/(<html(\s.*)?>)/.test(html)) {
      html = html.replace(
        /(<html(\s.*)?>)/,
        `$1<head><base href="${fileUrl.toString()}"></head>`
      );
    } else {
      html = `<head><base href="${fileUrl.toString()}"></head>${html}`;
    }
    if (html.indexOf("./codicon.ttf") !== -1) {
      html = html.replace("./codicon.ttf", fontsPath.toString());
    }
    return html;
  }
  private notFoundStaticHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>ESP-IDF Not Found</title>
</head>
<body>
    Error loading the page or the page not found
</body>
</html>`;
  }
}
