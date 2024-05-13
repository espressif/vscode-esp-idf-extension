/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 29th November 2021 3:08:04 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
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

import { join } from "path";
import {
  commands,
  ConfigurationTarget,
  Disposable,
  l10n,
  Uri,
  ViewColumn,
  WebviewPanel,
  window,
} from "vscode";
import { writeParameter } from "../idfConfiguration";
import { IWelcomeArgs } from "./welcomeInit";

export class WelcomePanel {
  public static currentPanel: WelcomePanel | undefined;

  public static createOrShow(
    extensionPath: string,
    welcomeArgs?: IWelcomeArgs
  ) {
    const column = window.activeTextEditor
      ? window.activeTextEditor.viewColumn
      : ViewColumn.One;
    if (WelcomePanel.currentPanel) {
      WelcomePanel.currentPanel.panel.reveal(column);
    } else {
      WelcomePanel.currentPanel = new WelcomePanel(
        extensionPath,
        column,
        welcomeArgs
      );
    }
  }

  public static isCreatedAndHidden() {
    return (
      WelcomePanel.currentPanel &&
      WelcomePanel.currentPanel.panel.visible === false
    );
  }

  private static readonly viewType = "welcomePanel";
  private readonly panel: WebviewPanel;
  private disposables: Disposable[] = [];

  constructor(
    private extensionPath: string,
    column: ViewColumn,
    welcomeArgs: IWelcomeArgs
  ) {
    const welcomePanelTitle = l10n.t("ESP-IDF Welcome");

    this.panel = window.createWebviewPanel(
      WelcomePanel.viewType,
      welcomePanelTitle,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          Uri.file(join(this.extensionPath, "dist", "views")),
        ],
      }
    );

    this.panel.iconPath = Uri.file(
      join(this.extensionPath, "media", "espressif_icon.png")
    );

    const scriptPath = this.panel.webview.asWebviewUri(
      Uri.file(
        join(this.extensionPath, "dist", "views", "welcomePage-bundle.js")
      )
    );

    this.panel.webview.html = this.createWelcomePageHtml(scriptPath);

    this.panel.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.command) {
        case "requestInitialValues":
          this.panel.webview.postMessage({
            command: "initialLoad",
            ...welcomeArgs,
          });
          break;
        case "configureExtension":
          await commands.executeCommand("espIdf.setup.start");
          break;
        case "newProject":
          await commands.executeCommand("espIdf.newProject.start");
          break;
        case "importProject":
          await commands.executeCommand("espIdf.importProject");
          break;
        case "showExamples":
          await commands.executeCommand("espIdf.examples.start");
          break;
        case "exploreComponents":
          await commands.executeCommand("esp.component-manager.ui.show");
          break;
        case "updateShowOnboardingOnInit":
          if (typeof msg.showOnInit !== "undefined") {
            await writeParameter(
              "idf.showOnboardingOnInit",
              msg.showOnInit,
              ConfigurationTarget.Global
            );
          }
        default:
          break;
      }
    });

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  private async openFolder() {
    const selectedFolder = await window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
    });
    if (selectedFolder && selectedFolder.length > 0) {
      return selectedFolder[0].fsPath;
    } else {
      window.showInformationMessage("No folder selected");
    }
  }

  private createWelcomePageHtml(scriptsPath: Uri): string {
    return `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>ESP-IDF Welcome</title>
        </head>
        <body>
          <div id="app"></div>
        </body>
        <script src="${scriptsPath}"></script>
      </html>`;
  }

  public dispose() {
    WelcomePanel.currentPanel = undefined;
    this.panel.dispose();
  }
}
