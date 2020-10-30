// Copyright 2020 Espressif Systems (Shanghai) CO LTD
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and

// limitations under the License.

import { join } from "path";
import * as vscode from "vscode";
import { Logger } from "../logger/logger";
import {
  CMakeListsType,
  loadCmakeListBuilder,
  updateCmakeListFile,
  updateWithValuesCMakeLists,
} from "./cmakeListsBuilder";

export class CmakeListsEditorPanel {
  public static currentPanel: CmakeListsEditorPanel | undefined;

  public static createOrShow(
    extensionPath: string,
    fileUri: vscode.Uri,
    type: CMakeListsType
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : vscode.ViewColumn.One;
    if (CmakeListsEditorPanel.currentPanel) {
      CmakeListsEditorPanel.currentPanel.panel.reveal(column);
    } else {
      CmakeListsEditorPanel.currentPanel = new CmakeListsEditorPanel(
        extensionPath,
        column,
        fileUri,
        type
      );
    }
  }

  private static readonly viewType = "cmakelists-editor";
  private panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  public constructor(
    extensionPath: string,
    column: vscode.ViewColumn,
    fileUri: vscode.Uri,
    type: CMakeListsType
  ) {
    this.panel = vscode.window.createWebviewPanel(
      CmakeListsEditorPanel.viewType,
      "CMakeLists.txt Editor",
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(join(extensionPath, "dist", "views")),
          vscode.Uri.file(
            join(extensionPath, "node_modules", "vscode-codicons", "dist")
          ),
        ],
      }
    );

    this.panel.iconPath = vscode.Uri.file(
      join(extensionPath, "media", "espressif_icon.png")
    );

    const scriptsPath = this.panel.webview.asWebviewUri(
      vscode.Uri.file(
        join(extensionPath, "dist", "views", "cmakelistsEditor-bundle.js")
      )
    );

    this.panel.webview.html = this.createCmakeListEditorHtml(scriptsPath);

    this.panel.onDidDispose(
      () => {
        this.dispose();
      },
      null,
      this.disposables
    );

    this.panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "loadCMakeListSchema":
          try {
            let listWithValues = await loadCmakeListBuilder(
              extensionPath,
              type
            );
            listWithValues = await updateWithValuesCMakeLists(
              fileUri,
              listWithValues
            );
            if (listWithValues) {
              this.panel.webview.postMessage({
                command: "loadElements",
                elements: listWithValues,
              });
            }
          } catch (error) {
            Logger.errorNotify(`Failed reading ${fileUri.fsPath}`, error);
          }
        case "saveChanges":
          if (message.newValues) {
            await updateCmakeListFile(fileUri, message.newValues);
            vscode.window.showInformationMessage(
              `${fileUri.fsPath} has been updated`
            );
          }
          break;
        default:
          break;
      }
    });
  }

  private dispose() {
    CmakeListsEditorPanel.currentPanel = undefined;
    this.panel.dispose();
  }

  private createCmakeListEditorHtml(scriptPath: vscode.Uri): string {
    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>CMakeLists.txt Editor</title>
            </head>
            <body>
                <div id="editor"></div>
            </body>
            <script src="${scriptPath}"></script>
        </html>`;
  }
}
