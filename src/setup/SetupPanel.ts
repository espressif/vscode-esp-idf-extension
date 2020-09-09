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
import { downloadInstallIdfVersion } from "./espIdfDownload";
import * as idfConf from "../idfConfiguration";
import path from "path";
import vscode from "vscode";
import * as utils from "../utils";
import { downloadEspIdfTools } from "./toolInstall";
import { IdfToolsManager, IEspIdfTool } from "../idfToolsManager";
import { OutputChannel } from "../logger/outputChannel";
import { Logger } from "../logger/logger";
import { installPyReqs } from "./installPyReqs";
import { StatusType } from "../views/setup/types";

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
    const toolsPath = path.join(containerPath, ".espressif");

    this.panel.webview.onDidReceiveMessage(async (message) => {
      console.log(message);
      switch (message.command) {
        case "checkEspIdfTools":
          if (message.espIdf && message.pyPath && message.toolsPath) {
            await this.checkRequiredTools(message.espIdf, message.toolsPath);
          }
          break;
        case "installEspIdf":
          if (
            message.selectedEspIdfVersion &&
            message.selectedPyPath &&
            message.manualEspIdfPath
          ) {
            await this.autoInstall(
              message.selectedEspIdfVersion,
              message.selectedPyPath,
              message.manualEspIdfPath
            );
          }
          break;
        case "installEspIdfOnly":
          if (
            message.selectedEspIdfVersion &&
            message.selectedPyPath &&
            message.manualEspIdfPath
          ) {
            await this.installEspIdf(
              message.selectedEspIdfVersion,
              message.manualEspIdfPath
            );
          }
          break;
        case "installEspIdfTools":
          if (message.espIdf && message.pyPath && message.toolsPath) {
            await this.installEspIdfTools(
              message.espIdf,
              message.pyPath,
              message.toolsPath
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
        case "openEspIdfToolsFolder":
          const selectedToolsFolder = await this.openFolder();
          this.panel.webview.postMessage({
            command: "updateEspIdfToolsFolder",
            selectedToolsFolder,
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
        case "saveCustomSettings":
          if (message.espIdfPath && message.pyBinPath && message.tools) {
            const { exportedPaths, exportedVars } = this.getCustomSetupSettings(
              message.tools
            );
            await this.saveSettings(
              message.espIdfPath,
              message.pyBinPath,
              exportedPaths,
              exportedVars
            );
            this.panel.webview.postMessage({
              command: "setIsInstalled",
              isInstalled: true,
            });
          }
          break;
        case "usePreviousSettings":
          if (
            setupArgs.espIdfPath &&
            setupArgs.pyBinPath &&
            setupArgs.exportedPaths &&
            setupArgs.exportedVars
          ) {
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

  private async installEspIdf(
    selectedIdfVersion: IEspIdfLink,
    espIdfPath: string
  ) {
    try {
      this.panel.webview.postMessage({
        command: "goToCustomPage",
        page: "/status",
      });
      let idfPath: string;
      if (selectedIdfVersion.filename === "manual") {
        idfPath = espIdfPath;
      } else {
        let idfContainerPath =
          process.platform === "win32"
            ? process.env.USERPROFILE
            : process.env.HOME;
        const option = await vscode.window.showQuickPick(
          [
            {
              label: `Use default (${idfContainerPath})`,
              target: "current",
            },
            { label: "Choose a container directory...", target: "another" },
          ],
          { placeHolder: "Select a directory to download ESP-IDF" }
        );
        if (option && option.target === "another") {
          idfContainerPath = (await this.openFolder()) || idfContainerPath;
        }
        await vscode.window.withProgress(
          {
            cancellable: true,
            location: vscode.ProgressLocation.Notification,
            title: "ESP-IDF",
          },
          async (
            progress: vscode.Progress<{ message: string; increment?: number }>,
            cancelToken: vscode.CancellationToken
          ) => {
            idfPath = await downloadInstallIdfVersion(
              selectedIdfVersion,
              idfContainerPath,
              progress,
              cancelToken
            );
          }
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
      const toolsManager = await IdfToolsManager.createIdfToolsManager(idfPath);
      const containerPath =
        process.platform === "win32"
          ? process.env.USERPROFILE
          : process.env.HOME;
      const toolsPath = path.join(containerPath, ".espressif", "tools");
      const exportedToolsPaths = await toolsManager.exportPathsInString(
        toolsPath
      );
      const requiredTools = await toolsManager.getRequiredToolsInfo(
        toolsPath,
        exportedToolsPaths
      );
      this.panel.webview.postMessage({
        command: "setRequiredToolsInfo",
        toolsInfo: requiredTools,
      });
      this.panel.webview.postMessage({
        command: "goToCustomPage",
        page: "/custom",
      });
    } catch (error) {
      const errMsg = error.message
        ? error.message
        : "Error during esp-idf install";
      OutputChannel.appendLine(errMsg);
      Logger.errorNotify(errMsg, error);
      OutputChannel.show();
      this.panel.webview.postMessage({
        command: "goToCustomPage",
        page: "/",
      });
    }
  }

  private async autoInstall(
    selectedIdfVersion: IEspIdfLink,
    pyPath: string,
    espIdfPath: string
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
            page: "/status",
          });
          const idfContainerPath =
            process.platform === "win32"
              ? process.env.USERPROFILE
              : process.env.HOME;
          let idfPath: string;
          if (selectedIdfVersion.filename === "manual") {
            idfPath = espIdfPath;
          } else {
            idfPath = await downloadInstallIdfVersion(
              selectedIdfVersion,
              idfContainerPath,
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
            command: "updateEspIdfToolsStatus",
            status: StatusType.started,
          });
          const toolsPath = path.join(idfContainerPath, ".espressif");
          const idfToolsManager = await IdfToolsManager.createIdfToolsManager(
            idfPath
          );
          await downloadEspIdfTools(
            toolsPath,
            idfToolsManager,
            progress,
            cancelToken
          );
          const exportPaths = await idfToolsManager.exportPathsInString(
            path.join(toolsPath, "tools")
          );
          const exportVars = await idfToolsManager.exportVars(
            path.join(toolsPath, "tools")
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
        } catch (error) {
          const errMsg = error.message
            ? error.message
            : "Error during auto install";
          OutputChannel.appendLine(errMsg);
          Logger.errorNotify(errMsg, error);
          OutputChannel.show();
          this.panel.webview.postMessage({
            command: "goToCustomPage",
            page: "/",
          });
        }
      }
    );
  }

  private async installEspIdfTools(
    idfPath: string,
    pyPath: string,
    toolsPath: string
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
          const idfToolsManager = await IdfToolsManager.createIdfToolsManager(
            idfPath
          );
          await downloadEspIdfTools(
            toolsPath,
            idfToolsManager,
            progress,
            cancelToken
          );
          const exportPaths = await idfToolsManager.exportPathsInString(
            path.join(toolsPath, "tools")
          );
          const exportVars = await idfToolsManager.exportVars(
            path.join(toolsPath, "tools")
          );
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
            command: "setIsInstalled",
            isInstalled: true,
          });
        } catch (error) {
          const errMsg = error.message
            ? error.message
            : "Error during ESP-IDF Tools install";
          OutputChannel.appendLine(errMsg);
          Logger.errorNotify(errMsg, error);
          OutputChannel.show();
          this.panel.webview.postMessage({
            command: "goToCustomPage",
            page: "/",
          });
        }
      }
    );
  }

  private async checkRequiredTools(idfPath: string, toolsInfo: IEspIdfTool[]) {
    const toolsManager = await IdfToolsManager.createIdfToolsManager(idfPath);
    const pathToVerify = toolsInfo
      .reduce((prev, curr, i) => {
        return prev + path.delimiter + curr.path;
      }, "")
      .slice(1);

    const foundVersions = await toolsManager.verifyPackages(pathToVerify);
    const updatedToolsInfo = toolsInfo.map((tool) => {
      const isToolVersionCorrect =
        tool.expected.indexOf(foundVersions[tool.name]) > -1;
      tool.doesToolExist = isToolVersionCorrect;
      return tool;
    });
    this.panel.webview.postMessage({
      command: "setRequiredToolsInfo",
      toolsInfo: updatedToolsInfo,
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

  private getCustomSetupSettings(toolsInfo: IEspIdfTool[]) {
    const exportedPaths = toolsInfo
      .reduce((prev, curr, i) => {
        return prev + path.delimiter + curr.path;
      }, "")
      .slice(1);
    const exportedVars = {};
    for (const tool of toolsInfo) {
      Object.keys(tool.env).forEach((key, index, arr) => {
        if (Object.keys(exportedVars).indexOf(key) !== -1) {
          exportedVars[key] = tool.env[key];
        }
      });
    }
    const exportedVarsStr = JSON.stringify(exportedVars);
    return { exportedPaths, exportedVars: exportedVarsStr };
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
