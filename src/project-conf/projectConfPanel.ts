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
  commands,
  Disposable,
  l10n,
  Uri,
  ViewColumn,
  WebviewPanel,
  window,
} from "vscode";
import { join } from "path";
import { ESP } from "../config";
import { getProjectConfigurationElements, saveProjectConfFileLegacy, configurePresetToProjectConfElement, projectConfElementToConfigurePreset } from ".";
import { IdfTarget } from "../espIdf/setTarget/getTargets";

export class projectConfigurationPanel {
  public static currentPanel: projectConfigurationPanel | undefined;

  public static createOrShow(
    extensionPath: string,
    workspaceFolder: Uri,
    idfTargets?: IdfTarget[]
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
        workspaceFolder,
        idfTargets
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
    private workspaceFolder: Uri,
    idfTargets: IdfTarget[]
  ) {
    const projectConfPanelTitle = l10n.t("ESP-IDF Project Configuration");

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
      Uri.file(join(this.extensionPath, "dist", "views", "project_conf-bundle.js"))
    );
    this.panel.webview.html = this.createSetupHtml(scriptPath);

    this.panel.webview.onDidReceiveMessage(async (message) => {
      let projectConfPresets = await getProjectConfigurationElements(
        this.workspaceFolder,
        false // Don't resolve paths for display
      );
      
      // Convert ConfigurePresets to legacy format for webview compatibility
      let projectConfObj: { [key: string]: ProjectConfElement } = {};
      for (const [name, preset] of Object.entries(projectConfPresets)) {
        projectConfObj[name] = configurePresetToProjectConfElement(preset);
      }
      
      switch (message.command) {
        case "command":
          break;
        case "requestInitialValues":
          this.panel.webview.postMessage({
            command: "initialLoad",
            confList: projectConfObj,
            idfTargets,
          });
          break;
        case "saveProjectConfFile":
          if (message.confDict) {
            await this.saveProjectConfFile(JSON.parse(message.confDict));
          }
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
        case "openFilePath":
          let selectedFile = await this.openFile();
          if (selectedFile) {
            this.panel.webview.postMessage({
              command: "setFilePath",
              confKey: message.confKey,
              newPath: selectedFile,
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

  private async openFile() {
    const selectedFile = await window.showOpenDialog({
      canSelectFolders: false,
      canSelectFiles: true,
      canSelectMany: false,
    });
    if (selectedFile && selectedFile.length > 0) {
      return selectedFile[0].fsPath;
    }
  }

  private clearSelectedProject(projectKeys: string[]) {
    const selectedConfig = ESP.ProjectConfiguration.store.get<string>(
      ESP.ProjectConfiguration.SELECTED_CONFIG
    );
    ESP.ProjectConfiguration.store.clear(selectedConfig);
    const isSelectedProjectInKeys = projectKeys.indexOf(selectedConfig);
    if (isSelectedProjectInKeys === -1) {
      ESP.ProjectConfiguration.store.clear(
        ESP.ProjectConfiguration.SELECTED_CONFIG
      );
      commands.executeCommand("espIdf.rmProjectConfStatusBar");
    }
  }

  private async saveProjectConfFile(projectConfDict: {
    [key: string]: ProjectConfElement;
  }) {
    const projectConfKeys = Object.keys(projectConfDict);
    this.clearSelectedProject(projectConfKeys);
    await saveProjectConfFileLegacy(this.workspaceFolder, projectConfDict);
    window.showInformationMessage(
      "Project Configuration changes has been saved"
    );
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
