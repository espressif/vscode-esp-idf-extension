/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 15th December 2020 4:48:44 pm
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
import { join } from "path";
import * as vscode from "vscode";
import { readFile } from "fs-extra";
import { Logger } from "../../../logger/logger";
import { file } from "tmp";

export class NVSPartitionTable {
  private static currentPanel: NVSPartitionTable;
  private static readonly viewType = "idfNvsPartitionTableEditor";
  private static readonly viewTitle = "ESP-IDF NVS Partition Table Editor";

  public static async createOrShow(extensionPath: string, filePath: string) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : vscode.ViewColumn.One;

    if (!!NVSPartitionTable.currentPanel) {
      if (NVSPartitionTable.currentPanel.filePath === filePath) {
        return NVSPartitionTable.currentPanel.panel.reveal(column);
      }
      await NVSPartitionTable.currentPanel.getCSVFromFile(filePath);
      return;
    } else {
      const panel = vscode.window.createWebviewPanel(
        NVSPartitionTable.viewType,
        NVSPartitionTable.viewTitle,
        column,
        {
          enableScripts: true,
          localResourceRoots: [
            vscode.Uri.file(join(extensionPath, "dist", "views")),
          ],
          retainContextWhenHidden: true,
        }
      );
      NVSPartitionTable.currentPanel = new NVSPartitionTable(
        extensionPath,
        filePath,
        panel
      );
    }
  }

  private static sendMessageToPanel(command: string, payload: object) {
    if (this.currentPanel.panel && this.currentPanel.panel.webview) {
      this.currentPanel.panel.webview.postMessage({ command, ...payload });
    }
  }

  private extensionPath: string;
  private filePath: string;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  private constructor(
    extensionPath: string,
    filePath: string,
    panel: vscode.WebviewPanel
  ) {
    this.extensionPath = extensionPath;
    this.filePath = filePath;
    this.panel = panel;
    this.panel.iconPath = vscode.Uri.file(
      join(extensionPath, "media", "espressif_icon.png")
    );
    this.panel.webview.onDidReceiveMessage(
      (e) => this.onMessage(e),
      null,
      this.disposables
    );
    this.panel.webview.html = this.createEditorHtml(this.panel.webview);
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  private async getCSVFromFile(filePath: string) {
    try {
      let csvContent: string = "";
      if (filePath.endsWith(".csv")) {
        csvContent = await readFile(filePath, "utf-8");
      }
      if (!csvContent) {
        return;
      }
      this.filePath = filePath;
      NVSPartitionTable.sendMessageToPanel("loadInitialData", {
        csv: csvContent,
      });
    } catch (error) {
      error.message
        ? Logger.errorNotify(error.message, error)
        : Logger.errorNotify(`Failed to read CSV from ${filePath}`, error);
      2;
    }
  }

  private dispose() {
    NVSPartitionTable.currentPanel = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      disposable.dispose();
    }
  }

  private createEditorHtml(webview: vscode.Webview): string {
    const scriptPath = webview.asWebviewUri(
      vscode.Uri.file(
        join(this.extensionPath, "dist", "views", "nvsPartitionTable-bundle.js")
      )
    );
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>ESP-IDF NVS Partition Table Editor</title>
    </head>
    <body>
      <section id="app"></section>
      <script src="${scriptPath}"></script>
    </body>
    </html>`;
  }

  private async onMessage(message: any) {
    switch (message.command) {
      case "getInitialData":
        await this.getCSVFromFile(this.filePath);
        break;
      case "openKeyFile":
        const filePath = await this.openFile();
        NVSPartitionTable.sendMessageToPanel("openKeyFile", {
          keyFilePath: filePath,
        });
        break;
      default:
        break;
    }
  }

  private async openFile() {
    const selectedFile = await vscode.window.showOpenDialog({
      canSelectFolders: false,
      canSelectFiles: true,
      canSelectMany: false,
    });
    if (selectedFile && selectedFile.length > 0) {
      return selectedFile[0].fsPath;
    } else {
      vscode.window.showInformationMessage("No file selected");
    }
  }
}
