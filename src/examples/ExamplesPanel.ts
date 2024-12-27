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

import { ensureDir, readFile, readJSON, writeJSON } from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import { Logger } from "../logger/logger";
import * as utils from "../utils";
import { createExamplesHtml } from "./createExamplesHtml";
import { ESP } from "../config";
import { getExamplesList, IExampleCategory } from "./Example";
import { ComponentManagerUIPanel } from "../component-manager/panel";
import { OutputChannel } from "../logger/outputChannel";
import { getEnvVariables } from "../eim/verifySetup";
import { IdfSetup } from "../eim/types";

export class ExamplesPlanel {
  public static currentPanel: ExamplesPlanel | undefined;

  public static createOrShow(
    extensionPath: string,
    targetFrameworkFolder: string,
    targetDesc: string,
    idfSetup: IdfSetup
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : vscode.ViewColumn.One;
    if (ExamplesPlanel.currentPanel) {
      ExamplesPlanel.currentPanel.panel.reveal(column);
    } else {
      ExamplesPlanel.currentPanel = new ExamplesPlanel(
        extensionPath,
        column,
        targetFrameworkFolder,
        targetDesc,
        idfSetup
      );
    }
  }

  private static readonly viewType = "examples";
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  private constructor(
    extensionPath: string,
    column: vscode.ViewColumn,
    targetFrameworkFolder: string,
    targetDesc: string,
    idfSetup: IdfSetup
  ) {
    const panelTitle = vscode.l10n.t("{targetDesc} Examples", { targetDesc });
    this.panel = vscode.window.createWebviewPanel(
      ExamplesPlanel.viewType,
      panelTitle,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(extensionPath, "dist", "views")),
          vscode.Uri.file(targetFrameworkFolder),
        ],
      }
    );
    const scriptPath = this.panel.webview.asWebviewUri(
      vscode.Uri.file(
        path.join(extensionPath, "dist", "views", "examples-bundle.js")
      )
    );
    this.panel.iconPath = utils.getWebViewFavicon(extensionPath);
    this.panel.webview.html = createExamplesHtml(scriptPath);

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "openExampleProject":
          if (message.project_path && message.name) {
            let selectedFolder: vscode.Uri[];
            if (process.env.CODE_TESTS_PATH) {
              const folderPath = await vscode.window.showInputBox();
              selectedFolder = [].concat(vscode.Uri.file(folderPath));
            } else {
              selectedFolder = await vscode.window.showOpenDialog({
                canSelectFolders: true,
                canSelectFiles: false,
                canSelectMany: false,
                openLabel: "Select Folder for New Project",
                title: `Choose Project Location for ${message.name} example`,
              });
            }
            if (!selectedFolder) {
              return;
            }
            try {
              const resultFolder = path.join(
                selectedFolder[0].fsPath,
                message.name
              );
              await ensureDir(resultFolder);
              await utils.copyFromSrcProject(
                message.project_path,
                vscode.Uri.file(resultFolder)
              );
              const projectPath = vscode.Uri.file(resultFolder);
              const settingsJsonPath = path.join(
                resultFolder,
                ".vscode",
                "settings.json"
              );
              await this.setCurrentSettingsInTemplate(
                settingsJsonPath,
                idfSetup,
              );
              vscode.commands.executeCommand("vscode.openFolder", projectPath);
            } catch (error) {
              const msg = `Error copying ESP-IDF example.`;
              Logger.error(msg, error, "ExamplesPanel copyFromSrcProject");
              const opt = await vscode.window.showErrorMessage(
                msg,
                "Show Docs",
                "Ok"
              );
              if (opt === "Show Docs") {
                vscode.env.openExternal(vscode.Uri.parse(ESP.URL.Docs.README));
              }
            }
          }
          break;
        case "getExamplesList":
          this.obtainExamplesList(targetFrameworkFolder);
          break;
        case "getExampleDetail":
          if (message.path) {
            const pathToUse = vscode.Uri.file(
              path.join(message.path, "README.md")
            );
            try {
              const content = await readFile(pathToUse.fsPath);
              const contentStr = utils.markdownToWebviewHtml(
                content.toString(),
                message.path,
                this.panel
              );
              this.panel.webview.postMessage({
                command: "set_example_detail",
                example_detail: contentStr,
              });
            } catch (err) {
              const notAvailable = vscode.l10n.t(
                "No README.md available for this project."
              );
              Logger.info(notAvailable);
              Logger.info(err);
              this.panel.webview.postMessage({
                command: "set_example_detail",
                example_detail: notAvailable,
              });
              vscode.window.showInformationMessage(notAvailable);
            }
          }
          break;
        case "showRegistry":
          const emptyURI: vscode.Uri = undefined;
          try {
            ComponentManagerUIPanel.show(extensionPath, emptyURI);
          } catch (error) {
            OutputChannel.appendLine(error.message);
            Logger.errorNotify(
              error.message,
              error,
              "ExamplesPanel show registry"
            );
          }
        default:
          return;
      }
    });
  }

  public dispose() {
    ExamplesPlanel.currentPanel = undefined;
    this.panel.dispose();
  }

  private async obtainExamplesList(targetFrameworkFolder: string) {
    const exampleListInfo: IExampleCategory = getExamplesList(
      targetFrameworkFolder
    );
    this.panel.webview.postMessage({
      command: "set_examples_path",
      example_list: exampleListInfo,
    });

    const selectedExample = exampleListInfo.examples.length
      ? exampleListInfo.examples[0]
      : exampleListInfo.subcategories.length
      ? exampleListInfo.subcategories[0]
      : undefined;

    this.panel.webview.postMessage({
      command: "set_initial_example",
      selected_example: selectedExample,
    });
  }

  private async setCurrentSettingsInTemplate(
    settingsJsonPath: string,
    idfSetup: IdfSetup
  ) {
    const settingsJson = await readJSON(settingsJsonPath);
    const customExtraVars = await getEnvVariables(idfSetup.activationScript);  
    settingsJson["idf.customExtraVars"] = customExtraVars;
    await writeJSON(settingsJsonPath, settingsJson, {
      spaces: vscode.workspace.getConfiguration().get("editor.tabSize") || 2,
    });
  }
}
