/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 31st January 2023 5:00:28 pm
 * Copyright 2023 Espressif Systems (Shanghai) CO LTD
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

import { ProjectConfElement } from "./projectConfiguration";
import {
  Disposable,
  StatusBarItem,
  Uri,
  ViewColumn,
  WebviewPanel,
  window,
} from "vscode";
import { LocDictionary } from "../localizationDictionary";
import { join } from "path";
import { ESP } from "../config";

const locDic = new LocDictionary("projectConfigurationPanel");

export class projectConfigurationPanel {
  public static currentPanel: projectConfigurationPanel | undefined;

  public static createOrShow(
    extensionPath: string,
    configBarItem?: StatusBarItem
  ) {
    const column = window.activeTextEditor
      ? window.activeTextEditor.viewColumn
      : ViewColumn.One;

    if (projectConfigurationPanel.currentPanel) {
      projectConfigurationPanel.currentPanel.panel.reveal(column);
    } else {
      projectConfigurationPanel.currentPanel = new projectConfigurationPanel(
        extensionPath,
        column,
        configBarItem
      );
    }
  }

  public static isCreatedAndHidden(): boolean {
    return (
      projectConfigurationPanel.currentPanel &&
      projectConfigurationPanel.currentPanel.panel.visible === false
    );
  }

  private static readonly viewType = "projectConfigurationPanel";
  private readonly panel: WebviewPanel;
  private disposables: Disposable[] = [];

  constructor(
    private extensionPath: string,
    column: ViewColumn,
    private configBarItem?: StatusBarItem
  ) {
    const projectConfPanelTitle = locDic.localize(
      "projectConfigurationPanel.panelName",
      "ESP-IDF Project Configuration"
    );

    this.panel = window.createWebviewPanel(
      projectConfigurationPanel.viewType,
      projectConfPanelTitle,
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
      join(extensionPath, "media", "espressif_icon.png")
    );

    const scriptPath = this.panel.webview.asWebviewUri(
      Uri.file(join(extensionPath, "dist", "views", "project_conf-bundle.js"))
    );
    this.panel.webview.html = this.createSetupHtml(scriptPath);

    let projectConfKeys = ESP.ProjectConfiguration.store.getKeys();
    let projectConfObj: { [key: string]: ProjectConfElement } = {};

    if (projectConfKeys && projectConfKeys.length) {
      for (const confKey of projectConfKeys) {
        projectConfObj[confKey] = ESP.ProjectConfiguration.store.get<
          ProjectConfElement
        >(confKey);
      }
    }

    this.panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "command":
          break;
        case "requestInitialValues":
          this.panel.webview.postMessage({
            command: "initialLoad",
            confList: projectConfObj,
          });
          break;
        case "saveProjectConfFile":
          await this.saveProjectConfFile(message.confDict);
          break;
        case "openBuildPath":
          let buildPath = await this.openFolder();
          if (buildPath) {
            this.panel.webview.postMessage({
              command: "setBuildPath",
              confKey: message.confKey,
              buildPath: buildPath,
              sectionsKeys: message.sectionsKeys,
            });
          }
          break;
        default:
          break;
      }
    });
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  private async clearProjectConfFile() {
    let projectConfKeys = ESP.ProjectConfiguration.store.getKeys();
    if (projectConfKeys && projectConfKeys.length) {
      for (const confKey of projectConfKeys) {
        ESP.ProjectConfiguration.store.clear(confKey);
      }
    }
  }

  private async openFolder() {
    const selectedFolder = await window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
    });
    if (selectedFolder && selectedFolder.length > 0) {
      return selectedFolder[0].fsPath;
    }
  }

  private clearSelectedProject(projectKeys: string[]) {
    const selectedConfig = ESP.ProjectConfiguration.store.get<string>(
      ESP.ProjectConfiguration.SELECTED_CONFIG
    );
    const isSelectedProjectInKeys = projectKeys.indexOf(selectedConfig);
    if (isSelectedProjectInKeys === -1) {
      ESP.ProjectConfiguration.store.clear(
        ESP.ProjectConfiguration.SELECTED_CONFIG
      );
      if (this.configBarItem) {
        this.configBarItem.dispose();
      }
    }
  }

  private async saveProjectConfFile(projectConfDict: {
    [key: string]: ProjectConfElement;
  }) {
    this.clearProjectConfFile();
    const projectConfKeys = Object.keys(projectConfDict);
    this.clearSelectedProject(projectConfKeys);
    for (const confKey of projectConfKeys) {
      ESP.ProjectConfiguration.store.set(confKey, projectConfDict[confKey]);
    }
    if (projectConfKeys && projectConfKeys.length) {
      ESP.ProjectConfiguration.store.set(
        ESP.ProjectConfiguration.CONFIGURATION_LIST_KEY,
        projectConfKeys
      );
    }
  }

  private createSetupHtml(scriptPath: Uri): string {
    return `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>ESP-IDF Project Configuration</title>
        </head>
        <body>
          <div id="editor"></div>
        </body>
        <script src="${scriptPath}"></script>
      </html>`;
  }

  public dispose() {
    projectConfigurationPanel.currentPanel = undefined;
    this.panel.dispose();
  }
}
