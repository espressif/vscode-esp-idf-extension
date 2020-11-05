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
import CMakeListsWebviewCollection from "./cmakeFilesCollection";

export class CmakeListsEditorPanel {
  public static cmakeListsPanels: CMakeListsWebviewCollection = new CMakeListsWebviewCollection();

  public static async createOrShow(extensionPath: string, fileUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : vscode.ViewColumn.One;
    const fileWebview = Array.from(this.cmakeListsPanels.get(fileUri.fsPath));
    if (fileWebview.length > 0) {
      fileWebview[0].reveal(column);
    } else {
      const selectType = await vscode.window.showQuickPick(
        [
          {
            label: `Component CMakeLists.txt`,
            target: CMakeListsType.Component,
          },
          {
            label: `Project CMakeLists.txt`,
            target: CMakeListsType.Project,
          },
        ],
        { placeHolder: "Select CMakeLists.txt type" }
      );
      if (!selectType) {
        return;
      }
      new CmakeListsEditorPanel(
        extensionPath,
        column,
        fileUri,
        selectType.target
      );
    }
  }

  private static readonly viewType = "cmakelists-editor";
  private disposables: vscode.Disposable[] = [];

  public constructor(
    extensionPath: string,
    column: vscode.ViewColumn,
    fileUri: vscode.Uri,
    type: CMakeListsType
  ) {
    const panel = vscode.window.createWebviewPanel(
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

    panel.iconPath = vscode.Uri.file(
      join(extensionPath, "media", "espressif_icon.png")
    );

    const scriptsPath = panel.webview.asWebviewUri(
      vscode.Uri.file(
        join(extensionPath, "dist", "views", "cmakelistsEditor-bundle.js")
      )
    );

    const fontsPath = panel.webview.asWebviewUri(
      vscode.Uri.file(
        join(extensionPath, "dist", "views", "fonts", "codicon.ttf")
      )
    );

    panel.webview.html = this.createCmakeListEditorHtml(scriptsPath, fontsPath);

    const cmakeListsWatcher = vscode.workspace.createFileSystemWatcher(
      fileUri.fsPath,
      true,
      false,
      false
    );
    cmakeListsWatcher.onDidDelete((e) => {
      panel.dispose();
    });
    cmakeListsWatcher.onDidChange(async (e) => {
      await this.loadCMakeListsFile(extensionPath, type, fileUri, panel);
    });

    panel.onDidDispose(
      () => {
        cmakeListsWatcher.dispose();
      },
      null,
      this.disposables
    );

    panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "loadCMakeListSchema":
          try {
            await this.loadCMakeListsFile(extensionPath, type, fileUri, panel);
            panel.webview.postMessage({
              command: "setFileName",
              fileName: fileUri.fsPath,
            });
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
    CmakeListsEditorPanel.cmakeListsPanels.add(fileUri.fsPath, panel);
  }

  private createCmakeListEditorHtml(
    scriptPath: vscode.Uri,
    fontsUri: vscode.Uri
  ): string {
    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>CMakeLists.txt Editor</title>
            </head>
            <body>
              <style>
              @font-face {
                  font-family: "codicon";
                  src: url('${fontsUri}') format('truetype');
              }
              </style>
              <div id="editor"></div>
            </body>
            <script src="${scriptPath}"></script>
        </html>`;
  }

  private async loadCMakeListsFile(
    extensionPath: string,
    type: CMakeListsType,
    fileUri: vscode.Uri,
    panel: vscode.WebviewPanel
  ) {
    let listWithValues = await loadCmakeListBuilder(extensionPath, type);
    listWithValues = await updateWithValuesCMakeLists(fileUri, listWithValues);
    if (listWithValues) {
      panel.webview.postMessage({
        command: "loadElements",
        elements: listWithValues,
      });
    }
  }
}
