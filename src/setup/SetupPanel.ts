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

import { LocDictionary } from "../localizationDictionary";
import { ISetupInitArgs } from "./setupInit";
import { IEspIdfLink } from "../views/setup/types";
import { downloadInstallIdfVersion } from "../onboarding/espIdfDownload";
import * as idfConf from "../idfConfiguration";
import path from "path";
import vscode from "vscode";

const locDic = new LocDictionary("SetupPanel");

export class SetupPanel {
  public static currentPanel: SetupPanel | undefined;

  public static createOrShow(
    extensionPath: string,
    setupArgs?: ISetupInitArgs
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : vscode.ViewColumn.One;
    if (SetupPanel.currentPanel) {
      SetupPanel.currentPanel.panel.reveal(column);
    } else {
      SetupPanel.currentPanel = new SetupPanel(
        extensionPath,
        column,
        setupArgs
      );
    }
  }

  public static isCreatedAndHidden(): boolean {
    return (
      SetupPanel.currentPanel && SetupPanel.currentPanel.panel.visible === false
    );
  }

  private static readonly viewType = "setupPanel";
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];
  private extesionPath: string;
  private confTarget: vscode.ConfigurationTarget =
    vscode.ConfigurationTarget.Global;

  constructor(
    extensionPath: string,
    column: vscode.ViewColumn,
    setupArgs: ISetupInitArgs
  ) {
    this.extesionPath = extensionPath;

    const setupPanelTitle = locDic.localize(
      "setupPanel.panelName",
      "ESP-IDF Setup"
    );

    this.panel = vscode.window.createWebviewPanel(
      SetupPanel.viewType,
      setupPanelTitle,
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
        path.join(extensionPath, "dist", "views", "setup-bundle.js")
      )
    );
    this.panel.webview.html = this.createSetupHtml(scriptPath);

    this.panel.webview.onDidReceiveMessage((message) => {
      console.log(message);
      switch (message.command) {
        case "installEspIdf":
          // One click install IDF
          break;
        case "requestInitialValues":
          this.panel.webview.postMessage({
            command: "initialLoad",
            idfVersions: setupArgs.espIdfVersionsList,
            pyVersionList: setupArgs.pythonVersions,
            gitVersion: setupArgs.gitVersion,
            espIdf: setupArgs.espIdfPath,
            pyBinPath: setupArgs.pyBinPath,
            toolsResults: setupArgs.toolsResults,
          });
          break;
        case "usePreviousSettings":
          if (
            setupArgs.espIdfPath &&
            setupArgs.pyBinPath &&
            setupArgs.exportedPaths &&
            setupArgs.exportedVars
          ) {
            this.saveSettings(
              setupArgs.espIdfPath,
              setupArgs.pyBinPath,
              setupArgs.exportedPaths,
              setupArgs.exportedVars
            );
          }
          break;
        default:
          break;
      }
    });

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  private async autoInstall(
    selectedIdfVersion: IEspIdfLink,
    pyPath: string,
    espIdfPath: string
  ) {
    // Do some magic
    let idfPath: string;
    if (selectedIdfVersion.filename === "manual") {
      idfPath = espIdfPath;
    } else {
      const idfContainerPath =
        process.platform === "win32"
          ? process.env.USERPROFILE
          : process.env.HOME;
      await downloadInstallIdfVersion(
        selectedIdfVersion,
        idfPath,
        this.confTarget
      );
      idfPath = path.join(idfContainerPath, "esp-idf");
    }
  }

  private saveSettings(
    espIdfPath: string,
    pythonBinPath: string,
    exportedPaths: string,
    exportedVars: string
  ) {
    idfConf.writeParameter("idf.espIdfPath", espIdfPath, this.confTarget);
    idfConf.writeParameter("idf.pythonBinPath", pythonBinPath, this.confTarget);
    idfConf.writeParameter(
      "idf.customExtraPaths",
      exportedPaths,
      this.confTarget
    );
    idfConf.writeParameter(
      "idf.customExtraVars",
      exportedVars,
      this.confTarget
    );
  }

  private createSetupHtml(scriptPath: vscode.Uri): string {
    return `<!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>ESP-IDF Setup</title>
          </head>
          <body>
              <div id="app"></div>
          </body>
          <script src="${scriptPath}"></script>
      </html>`;
  }

  public dispose() {
    SetupPanel.currentPanel = undefined;
    this.panel.dispose();
  }
}
