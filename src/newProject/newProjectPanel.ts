// Copyright 2019 Espressif Systems (Shanghai) CO LTD
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
import * as path from "path";
import * as vscode from "vscode";
import * as idfConf from "../idfConfiguration";
import { LocDictionary } from "../localizationDictionary";
import { INewProjectArgs } from "./newProjectInit";
import { IComponent } from "../espIdf/idfComponent/IdfComponent";

const locDictionary = new LocDictionary("NewProjectPanel");

export class NewProjectPanel {
  public static currentPanel: NewProjectPanel | undefined;

  public static createOrShow(
    extensionPath: string,
    newProjectArgs?: INewProjectArgs
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : vscode.ViewColumn.One;
    if (NewProjectPanel.currentPanel) {
      NewProjectPanel.currentPanel.panel.reveal(column);
    } else {
      NewProjectPanel.currentPanel = new NewProjectPanel(
        extensionPath,
        newProjectArgs,
        column
      );
    }
  }

  public static isCreatedAndHidden(): boolean {
    return (
      NewProjectPanel.currentPanel &&
      !NewProjectPanel.currentPanel.panel.visible
    );
  }

  private static readonly viewType = "newProjectWizard";
  private readonly panel: vscode.WebviewPanel;
  private extensionPath: string;

  private constructor(
    extensionPath: string,
    newProjectArgs: INewProjectArgs,
    column: vscode.ViewColumn
  ) {
    this.extensionPath = extensionPath;
    const newProjectTitle = locDictionary.localize(
      "newProject.panelName",
      "New Project Wizard"
    );
    this.panel = vscode.window.createWebviewPanel(
      NewProjectPanel.viewType,
      newProjectTitle,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(this.extensionPath, "dist", "views")),
          vscode.Uri.file(
            path.join(
              this.extensionPath,
              "node_modules",
              "vscode-codicons",
              "dist"
            )
          ),
        ],
      }
    );

    const scriptPath = this.panel.webview.asWebviewUri(
      vscode.Uri.file(
        path.join(this.extensionPath, "dist", "views", "newProject-bundle.js")
      )
    );
    const codiconsUri = this.panel.webview.asWebviewUri(
      vscode.Uri.file(
        path.join(
          this.extensionPath,
          "node_modules",
          "vscode-codicons",
          "dist",
          "codicon.css"
        )
      )
    );
    this.panel.webview.html = this.createHtml(scriptPath, codiconsUri);

    const containerPath =
      process.platform === "win32" ? process.env.USERPROFILE : process.env.HOME;

    this.panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "loadComponent":
          let selectedFolder = await this.openFolder();
          if (selectedFolder) {
            const newComponent: IComponent = {
              name: path.basename(selectedFolder),
              path: selectedFolder,
            };
            this.panel.webview.postMessage({
              command: "addComponentPath",
              component: newComponent,
            });
          }
          break;
        case "openProjectDirectory":
          let selectedProjectDir = await this.openFolder();
          if (selectedProjectDir) {
            this.panel.webview.postMessage({
              command: "setContainerDirectory",
              projectDirectory: selectedProjectDir,
            });
          }
          break;
        case "requestInitValues":
          if (
            newProjectArgs &&
            newProjectArgs.targetList &&
            newProjectArgs.targetList.length > 0 &&
            newProjectArgs.serialPortList &&
            newProjectArgs.serialPortList.length > 0
          ) {
            this.panel.webview.postMessage({
              command: "initialLoad",
              containerDirectory: containerPath,
              projectName: "project-name",
              serialPortList: newProjectArgs.serialPortList,
              targetList: newProjectArgs.targetList,
              openOcdConfigFiles: newProjectArgs.targetList[0].openOcdFiles,
              templates: newProjectArgs.templates,
            });
          }
          break;
        default:
          break;
      }
    });
  }

  private async openFolder() {
    const selectedFolder = await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
    });
    if (selectedFolder && selectedFolder.length > 0) {
      return selectedFolder[0].fsPath;
    } else {
      vscode.window.showInformationMessage("No folder selected");
    }
  }

  private createHtml(scriptPath: vscode.Uri, codiconsUri: vscode.Uri): string {
    return `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>ESP-IDF Project</title>
          <link href="${codiconsUri}" rel="stylesheet" />
        </head>
        <body>
          <div id="app"></div>
        </body>
        <script src="${scriptPath}"></script>
      </html>`;
  }
}
