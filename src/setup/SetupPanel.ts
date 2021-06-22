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
import { ISetupInitArgs, saveSettings } from "./setupInit";
import {
  IdfMirror,
  IEspIdfLink,
  IEspIdfTool,
  SetupMode,
  StatusType,
} from "../views/setup/types";
import * as idfConf from "../idfConfiguration";
import { ensureDir } from "fs-extra";
import path from "path";
import vscode from "vscode";
import { expressInstall } from "./espIdfDownloadStep";
import { IdfToolsManager } from "../idfToolsManager";
import { installExtensionPyReqs } from "./installPyReqs";
import { OutputChannel } from "../logger/outputChannel";
import { Logger } from "../logger/logger";
import { createPyReqs } from "./pyReqsInstallStep";
import { downloadIdfTools } from "./toolsDownloadStep";
import { installIdfGit, installIdfPython } from "./embedGitPy";

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
        ],
      }
    );
    this.panel.iconPath = vscode.Uri.file(
      path.join(extensionPath, "media", "espressif_icon.png")
    );

    const scriptPath = this.panel.webview.asWebviewUri(
      vscode.Uri.file(
        path.join(extensionPath, "dist", "views", "setup-bundle.js")
      )
    );
    this.panel.webview.html = this.createSetupHtml(scriptPath);

    const containerPath =
      process.platform === "win32" ? process.env.USERPROFILE : process.env.HOME;
    const defaultEspIdfPathContainer = path.join(containerPath, "esp");

    this.panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "checkEspIdfTools":
          if (message.espIdf && message.pyPath && message.toolsPath) {
            await this.checkRequiredTools(message.espIdf, message.toolsPath);
          }
          break;
        case "installEspIdf":
          if (
            message.espIdfContainer &&
            message.selectedEspIdfVersion &&
            message.selectedPyPath &&
            message.toolsPath &&
            typeof message.manualEspIdfPath !== undefined &&
            typeof message.mirror !== undefined &&
            typeof message.setupMode !== undefined
          ) {
            if (message.espIdfContainer === defaultEspIdfPathContainer) {
              await ensureDir(defaultEspIdfPathContainer);
            }
            await this.autoInstall(
              message.toolsPath,
              message.selectedEspIdfVersion,
              message.selectedPyPath,
              message.manualEspIdfPath,
              message.espIdfContainer,
              message.mirror,
              message.setupMode
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
        case "openEspIdfContainerFolder":
          const selectedContainerFolder = await this.openFolder();
          this.panel.webview.postMessage({
            command: "updateEspIdfContainerFolder",
            selectedContainerFolder,
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
          const pathSep = path.sep;
          this.panel.webview.postMessage({
            command: "initialLoad",
            espIdfContainer: defaultEspIdfPathContainer,
            espIdf: setupArgs.espIdfPath,
            espToolsPath: setupArgs.espToolsPath,
            gitVersion: setupArgs.gitVersion,
            hasPrerequisites: setupArgs.hasPrerequisites,
            idfVersion: setupArgs.espIdfVersion,
            idfVersions: setupArgs.espIdfVersionsList,
            pathSep,
            pyBinPath: setupArgs.pyBinPath,
            pyVersionList: setupArgs.pythonVersions,
            toolsResults: setupArgs.toolsResults,
          });
          break;
        case "saveCustomSettings":
          if (
            message.espIdfPath &&
            message.toolsPath &&
            message.pyBinPath &&
            message.tools
          ) {
            const { exportedPaths, exportedVars } = this.getCustomSetupSettings(
              message.tools
            );
            this.panel.webview.postMessage({
              command: "updateEspIdfToolsStatus",
              status: StatusType.installed,
            });
            await this.installPyReqs(
              message.espIdfPath,
              message.toolsPath,
              message.pyBinPath,
              exportedPaths,
              exportedVars
            );
          }
          break;
        case "usePreviousSettings":
          if (
            setupArgs.espIdfPath &&
            setupArgs.pyBinPath &&
            setupArgs.exportedPaths &&
            setupArgs.exportedVars
          ) {
            this.panel.webview.postMessage({
              command: "updateIdfGitStatus",
              status: StatusType.installed,
            });
            this.panel.webview.postMessage({
              command: "updateIdfPythonStatus",
              status: StatusType.installed,
            });
            this.panel.webview.postMessage({
              command: "updateEspIdfStatus",
              status: StatusType.installed,
            });
            this.panel.webview.postMessage({
              command: "updateEspIdfToolsStatus",
              status: StatusType.installed,
            });
            this.panel.webview.postMessage({
              command: "updatePyVEnvStatus",
              status: StatusType.started,
            });
            this.panel.webview.postMessage({
              command: "goToCustomPage",
              installing: true,
              page: "/status",
            });
            await installExtensionPyReqs(
              setupArgs.espToolsPath,
              setupArgs.pyBinPath
            );
            await saveSettings(
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

  setupErrHandler(error: Error) {
    const errMsg = error.message ? error.message : "Error during ESP-IDF setup";
    if (errMsg.indexOf("ERROR_EXISTING_ESP_IDF") !== -1) {
      SetupPanel.postMessage({
        command: "setEspIdfErrorStatus",
        errorMsg: error.message,
      });
    } else if (errMsg.indexOf("ERROR_INVALID_PYTHON") !== -1) {
      SetupPanel.postMessage({
        command: "setPyExecErrorStatus",
        errorMsg: error.message,
      });
    } else if (errMsg.indexOf("ERROR_INVALID_PIP") !== -1) {
      SetupPanel.postMessage({
        command: "setPyExecErrorStatus",
        errorMsg: error.message,
      });
    } else {
      SetupPanel.postMessage({
        command: "setEspIdfErrorStatus",
        errorMsg: "",
      });
    }
    OutputChannel.appendLine(errMsg);
    Logger.errorNotify(errMsg, error);
    OutputChannel.show();
    SetupPanel.postMessage({
      command: "goToCustomPage",
      installing: false,
      page: "/autoinstall",
    });
  }

  private async autoInstall(
    toolsPath: string,
    selectedIdfVersion: IEspIdfLink,
    pyPath: string,
    espIdfPath: string,
    idfContainerPath: string,
    mirror: IdfMirror,
    setupMode: SetupMode
  ) {
    return await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "ESP-IDF Setup:",
        cancellable: true,
      },
      async (
        progress: vscode.Progress<{ message: string; increment?: number }>,
        cancelToken: vscode.CancellationToken
      ) => {
        try {
          SetupPanel.postMessage({
            command: "goToCustomPage",
            installing: true,
            page: "/status",
          });
          let idfPythonPath = pyPath,
            idfGitPath = "git";
          if (process.platform === "win32") {
            const embedPaths = await this.installEmbedPyGit(
              toolsPath,
              progress,
              cancelToken
            );
            idfGitPath = embedPaths.idfGitPath;
            idfPythonPath = embedPaths.idfPythonPath;
          }
          await expressInstall(
            selectedIdfVersion,
            idfPythonPath,
            espIdfPath,
            idfContainerPath,
            toolsPath,
            mirror,
            setupMode,
            idfGitPath,
            progress,
            cancelToken
          );
        } catch (error) {
          this.setupErrHandler(error);
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
      if (isToolVersionCorrect) {
        tool.progress = "100.00%";
        tool.hashResult = true;
      } else {
        tool.progress = "0.00%";
        tool.hashResult = false;
      }
      return tool;
    });
    this.panel.webview.postMessage({
      command: "setRequiredToolsInfo",
      toolsInfo: updatedToolsInfo,
    });
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

  private async installEspIdfTools(
    idfPath: string,
    pyPath: string,
    toolsPath: string
  ) {
    return await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "ESP-IDF Tools Setup:",
        cancellable: true,
      },
      async (
        progress: vscode.Progress<{ message: string; increment?: number }>,
        cancelToken: vscode.CancellationToken
      ) => {
        try {
          SetupPanel.postMessage({
            command: "goToCustomPage",
            installing: true,
            page: "/status",
          });
          await downloadIdfTools(
            idfPath,
            toolsPath,
            pyPath,
            progress,
            cancelToken
          );
        } catch (error) {
          this.setupErrHandler(error);
        }
      }
    );
  }

  private async installPyReqs(
    idfPath: string,
    toolsPath: string,
    pyPath: string,
    exportPaths: string,
    exportVars: string
  ) {
    return await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "ESP-IDF Python Requirements:",
        cancellable: true,
      },
      async (
        progress: vscode.Progress<{ message: string; increment?: number }>,
        cancelToken: vscode.CancellationToken
      ) => {
        try {
          SetupPanel.postMessage({
            command: "goToCustomPage",
            installing: true,
            page: "/status",
          });
          await createPyReqs(
            idfPath,
            toolsPath,
            pyPath,
            exportPaths,
            exportVars,
            progress,
            cancelToken
          );
        } catch (error) {
          this.setupErrHandler(error);
        }
      }
    );
  }

  private async installEmbedPyGit(
    toolsPath: string,
    progress: vscode.Progress<{ message: string; increment?: number }>,
    cancelToken: vscode.CancellationToken
  ) {
    const idfGitPath = await installIdfGit(toolsPath, progress, cancelToken);
    SetupPanel.postMessage({
      command: "updateIdfGitStatus",
      status: StatusType.installed,
    });
    const idfPythonPath = await installIdfPython(
      toolsPath,
      progress,
      cancelToken
    );
    SetupPanel.postMessage({
      command: "updateIdfPythonStatus",
      status: StatusType.installed,
    });
    const confTarget = idfConf.readParameter(
      "idf.saveScope"
    ) as vscode.ConfigurationTarget;
    await idfConf.writeParameter(
      "idf.gitPath",
      idfGitPath,
      confTarget
    );
    return { idfPythonPath, idfGitPath };
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
