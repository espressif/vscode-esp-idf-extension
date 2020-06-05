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

import { ensureDir, readFile } from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import * as idfConf from "../idfConfiguration";
import { LocDictionary } from "../localizationDictionary";
import { Logger } from "../logger/logger";
import * as utils from "../utils";
import { createExamplesHtml } from "./createExamplesHtml";

const locDic = new LocDictionary("ExamplesPanel");

export class ExamplesPlanel {
  public static currentPanel: ExamplesPlanel | undefined;

  public static createOrShow(extensionPath: string) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;
    if (ExamplesPlanel.currentPanel) {
      ExamplesPlanel.currentPanel.panel.reveal(column);
    } else {
      ExamplesPlanel.currentPanel = new ExamplesPlanel(
        extensionPath,
        column || vscode.ViewColumn.One
      );
    }
  }

  private static readonly viewType = "examples";
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  private constructor(extensionPath: string, column: vscode.ViewColumn) {
    const onBoardingPanelTitle = locDic.localize(
      "examples.panelName",
      "ESP-IDF Examples"
    );
    this.panel = vscode.window.createWebviewPanel(
      ExamplesPlanel.viewType,
      onBoardingPanelTitle,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(extensionPath, "dist", "views")),
        ],
      }
    );
    const scriptPath = this.panel.webview.asWebviewUri(
      vscode.Uri.file(
        path.join(extensionPath, "dist", "views", "examples-bundle.js")
      )
    );
    this.panel.webview.html = createExamplesHtml(scriptPath);

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.panel.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case "openExampleProject":
          if (message.project_path && message.name) {
            vscode.window
              .showOpenDialog({
                canSelectFolders: true,
                canSelectFiles: false,
                canSelectMany: false,
              })
              .then((selectedFolder: vscode.Uri[]) => {
                if (selectedFolder && selectedFolder[0].fsPath) {
                  const resultFolder = path.join(
                    selectedFolder[0].fsPath,
                    message.name
                  );
                  ensureDir(resultFolder)
                    .then(() => {
                      utils.copyFromSrcProject(
                        message.project_path,
                        resultFolder
                      );
                      const projectPath = vscode.Uri.file(resultFolder);
                      vscode.commands.executeCommand(
                        "vscode.openFolder",
                        projectPath
                      );
                    })
                    .catch((err) => {
                      Logger.errorNotify("Error copying ESP-IDF example", err);
                    });
                } else {
                  vscode.window.showInformationMessage("No folder selected");
                }
              });
          }
          break;
        case "getExamplesList":
          this.obtainExamplesList();
          break;
        case "getExampleDetail":
          if (message.path) {
            const pathToUse = vscode.Uri.file(
              path.join(message.path, "README.md")
            );
            readFile(pathToUse.fsPath).then(
              (content) => {
                this.panel.webview.postMessage({
                  command: "set_example_detail",
                  example_detail: content.toString(),
                });
              },
              (err) => {
                const notAvailable = "No README.md available for this project.";
                Logger.info(notAvailable);
                Logger.info(err);
                this.panel.webview.postMessage({
                  command: "set_example_detail",
                  example_detail: notAvailable,
                });
                vscode.window.showInformationMessage(notAvailable);
              }
            );
          }
          break;
        default:
          return;
      }
    });
  }

  public dispose() {
    ExamplesPlanel.currentPanel = undefined;
    this.panel.dispose();
  }

  private obtainExamplesList() {
    const espIdfPath = idfConf.readParameter("idf.espIdfPath") as string;
    const examplesPath = path.join(espIdfPath, "examples");
    const examplesCategories = utils.getDirectories(examplesPath);
    const examplesListPaths = utils.getSubProjects(examplesPath);
    const exampleListInfo = examplesListPaths.map((examplePath) => {
      const exampleCategory = examplesCategories.find(
        (exampleCat) => examplePath.indexOf(exampleCat) > -1
      );
      const regexToUse =
        process.platform === "win32" ? /([^\\]*)\\*$/ : /([^\/]*)\/*$/;
      const exampleName = examplePath.match(regexToUse)[1];
      return {
        category: exampleCategory,
        name: exampleName,
        path: examplePath,
      };
    });
    this.panel.webview.postMessage({
      command: "set_examples_path",
      example_list: exampleListInfo,
    });

    this.panel.webview.postMessage({
      command: "set_initial_example",
      selected_example: exampleListInfo[0],
    });
  }
}
