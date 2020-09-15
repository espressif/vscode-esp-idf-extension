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
import { IdfMirror, IEspIdfLink } from "../views/setup/types";
import { downloadInstallIdfVersion } from "./espIdfDownload";
import * as idfConf from "../idfConfiguration";
import path from "path";
import vscode from "vscode";
import * as utils from "../utils";
import { downloadEspIdfTools } from "./toolInstall";
import { IdfToolsManager } from "../idfToolsManager";
import { OutputChannel } from "../logger/outputChannel";
import { Logger } from "../logger/logger";
import { installExtensionPyReqs, installPyReqs } from "./installPyReqs";
import { StatusType } from "../views/setup/types";
import { ensureDir } from "fs-extra";

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

  public static postMessage(content: any) {
    if (SetupPanel.currentPanel) {
      SetupPanel.currentPanel.panel.webview.postMessage(content);
    }
  }

  private static readonly viewType = "setupPanel";
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];
  private confTarget: vscode.ConfigurationTarget =
    vscode.ConfigurationTarget.Global;

  constructor(
    private extensionPath: string,
    column: vscode.ViewColumn,
    setupArgs: ISetupInitArgs
  ) {
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
        path.join(this.extensionPath, "dist", "views", "setup-bundle.js")
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
    this.panel.webview.html = this.createSetupHtml(scriptPath, codiconsUri);

    const espIdfPath = idfConf.readParameter("idf.espIdfPath") as string;
    const containerPath =
      process.platform === "win32" ? process.env.USERPROFILE : process.env.HOME;
    const defaultEspIdfPath = path.join(containerPath, "esp");
    const toolsPath = path.join(containerPath, ".espressif");

    this.panel.webview.onDidReceiveMessage(async (message) => {
      console.log(message);
      switch (message.command) {
        case "installEspIdf":
          if (
            message.espIdfContainer &&
            message.selectedEspIdfVersion &&
            message.selectedPyPath &&
            message.manualEspIdfPath &&
            typeof message.mirror !== undefined
          ) {
            if (message.espIdfContainer === defaultEspIdfPath) {
              await ensureDir(defaultEspIdfPath);
            }
            await this.autoInstall(
              message.selectedEspIdfVersion,
              message.selectedPyPath,
              message.manualEspIdfPath,
              message.espIdfContainer,
              message.mirror
            );
          }
          break;
        case "openEspIdfFolder":
          const selectedFolder = await this.openFolder();
          this.panel.webview.postMessage({
            command: "updateEspIdfFolder",
            selectedFolder,
          });
          break;
        case "openEspIdfContainerFolder":
          const selectedContainerFolder = await this.openFolder();
          this.panel.webview.postMessage({
            command: "updateEspIdfContainerFolder",
            selectedContainerFolder,
          });
          break;
        case "openPythonPath":
          const selectedPyPath = await this.openFile();
          this.panel.webview.postMessage({
            command: "updatePythonPath",
            selectedPyPath,
          });
          break;
        case "requestInitialValues":
          this.panel.webview.postMessage({
            command: "initialLoad",
            espIdfContainer: defaultEspIdfPath,
            espIdf: setupArgs.espIdfPath || espIdfPath,
            espToolsPath: setupArgs.espToolsPath || toolsPath,
            gitVersion: setupArgs.gitVersion,
            hasPrerequisites: setupArgs.hasPrerequisites,
            idfVersions: setupArgs.espIdfVersionsList,
            pyBinPath: setupArgs.pyBinPath,
            pyVersionList: setupArgs.pythonVersions,
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
            await installExtensionPyReqs(
              setupArgs.espToolsPath,
              setupArgs.pyBinPath
            );
            await this.saveSettings(
              setupArgs.espIdfPath,
              setupArgs.pyBinPath,
              setupArgs.exportedPaths,
              setupArgs.exportedVars
            );
            this.panel.webview.postMessage({
              command: "setIsInstalled",
              isInstalled: true,
            });
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
    espIdfPath: string,
    idfContainerPath: string,
    mirror: IdfMirror
  ) {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "ESP-IDF",
        cancellable: true,
      },
      async (
        progress: vscode.Progress<{ message: string; increment?: number }>,
        cancelToken: vscode.CancellationToken
      ) => {
        try {
          this.panel.webview.postMessage({
            command: "goToCustomPage",
            installing: true,
            page: "/status",
          });
          let idfPath: string;
          if (selectedIdfVersion.filename === "manual") {
            idfPath = espIdfPath;
          } else {
            idfPath = await downloadInstallIdfVersion(
              selectedIdfVersion,
              idfContainerPath,
              mirror,
              progress,
              cancelToken
            );
          }
          const idfVersion = await utils.getEspIdfVersion(idfPath);
          if (idfVersion === "x.x") {
            throw new Error("Invalid ESP-IDF");
          }
          this.panel.webview.postMessage({
            command: "updateEspIdfFolder",
            selectedFolder: idfPath,
          });
          this.panel.webview.postMessage({
            command: "updateEspIdfStatus",
            status: StatusType.installed,
          });
          this.panel.webview.postMessage({
            command: "setEspIdfErrorStatus",
            errorMsg: `ESP-IDF is installed in ${idfPath}`,
          });
          this.panel.webview.postMessage({
            command: "updateEspIdfToolsStatus",
            status: StatusType.started,
          });
          const containerPath =
            process.platform === "win32"
              ? process.env.USERPROFILE
              : process.env.HOME;
          const toolsPath = path.join(containerPath, ".espressif");
          const idfToolsManager = await IdfToolsManager.createIdfToolsManager(
            idfPath
          );
          const exportPaths = await idfToolsManager.exportPathsInString(
            path.join(toolsPath, "tools")
          );
          const exportVars = await idfToolsManager.exportVars(
            path.join(toolsPath, "tools")
          );
          const requiredTools = await idfToolsManager.getRequiredToolsInfo(
            toolsPath,
            exportPaths
          );
          this.panel.webview.postMessage({
            command: "setRequiredToolsInfo",
            toolsInfo: requiredTools,
          });
          await downloadEspIdfTools(
            toolsPath,
            idfToolsManager,
            progress,
            cancelToken
          );
          this.panel.webview.postMessage({
            command: "updateEspIdfToolsStatus",
            status: StatusType.installed,
          });
          this.panel.webview.postMessage({
            command: "updatePyVEnvStatus",
            status: StatusType.started,
          });
          const virtualEnvPath = await installPyReqs(
            idfPath,
            toolsPath,
            pyPath,
            progress,
            cancelToken
          );
          await this.saveSettings(
            idfPath,
            virtualEnvPath,
            exportPaths,
            exportVars
          );
          this.panel.webview.postMessage({
            command: "updatePyVEnvStatus",
            status: StatusType.installed,
          });
          this.panel.webview.postMessage({
            command: "setIsInstalled",
            isInstalled: true,
          });
          this.panel.webview.postMessage({
            command: "setIsIdfInstalling",
            installing: false,
          });
        } catch (error) {
          if (
            error &&
            error.message &&
            (error.message.indexOf("ERROR_EXISTING_ESP_IDF") > -1 ||
              error.message.indexOf("ERROR_NON_EXISTING_CONTAINER") > -1)
          ) {
            this.panel.webview.postMessage({
              command: "setEspIdfErrorStatus",
              errorMsg: error.message,
            });
            OutputChannel.appendLine(error.message);
            Logger.errorNotify(error.message, error);
            return;
          }
          const errMsg = error.message
            ? error.message
            : "Error during auto install";
          OutputChannel.appendLine(errMsg);
          Logger.errorNotify(errMsg, error);
          OutputChannel.show();
          this.panel.webview.postMessage({
            command: "goToCustomPage",
            installing: false,
            page: "/",
          });
        }
      }
    );
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

  private async openFile() {
    const selectedFolder = await vscode.window.showOpenDialog({
      canSelectFolders: false,
      canSelectFiles: true,
      canSelectMany: false,
    });
    if (selectedFolder && selectedFolder.length > 0) {
      return selectedFolder[0].fsPath;
    } else {
      vscode.window.showInformationMessage("No folder selected");
    }
  }

  private async saveSettings(
    espIdfPath: string,
    pythonBinPath: string,
    exportedPaths: string,
    exportedVars: string
  ) {
    await idfConf.writeParameter("idf.espIdfPath", espIdfPath, this.confTarget);
    await idfConf.writeParameter(
      "idf.pythonBinPath",
      pythonBinPath,
      this.confTarget
    );
    await idfConf.writeParameter(
      "idf.customExtraPaths",
      exportedPaths,
      this.confTarget
    );
    await idfConf.writeParameter(
      "idf.customExtraVars",
      exportedVars,
      this.confTarget
    );
    vscode.window.showInformationMessage("ESP-IDF has been configured");
  }

  private createSetupHtml(
    scriptPath: vscode.Uri,
    codiconsUri: vscode.Uri
  ): string {
    return `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>ESP-IDF Setup</title>
          <link href="${codiconsUri}" rel="stylesheet" />
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
