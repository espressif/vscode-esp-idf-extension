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
} from "../views/setup/types";
import { downloadInstallIdfVersion } from "./espIdfDownload";
import * as idfConf from "../idfConfiguration";
import path from "path";
import vscode from "vscode";
import * as utils from "../utils";
import { downloadEspIdfTools } from "./toolInstall";
import { IdfToolsManager } from "../idfToolsManager";
import { OutputChannel } from "../logger/outputChannel";
import { Logger } from "../logger/logger";
import {
  checkPythonPipExists,
  installExtensionPyReqs,
  installPyReqs,
} from "./installPyReqs";
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
    this.panel.iconPath = vscode.Uri.file(
      path.join(extensionPath, "media", "espressif_icon.png")
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
    const defaultEspIdfPathContainer = path.join(containerPath, "esp");
    const toolsPath = idfConf.readParameter("idf.toolsPath");

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
            message.manualEspIdfPath &&
            typeof message.mirror !== undefined &&
            typeof message.setupMode !== undefined
          ) {
            if (message.espIdfContainer === defaultEspIdfPathContainer) {
              await ensureDir(defaultEspIdfPathContainer);
            }
            await this.autoInstall(
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
          this.panel.webview.postMessage({
            command: "initialLoad",
            espIdfContainer: defaultEspIdfPathContainer,
            espIdf: espIdfPath || setupArgs.espIdfPath,
            espToolsPath: toolsPath || setupArgs.espToolsPath,
            gitVersion: setupArgs.gitVersion,
            hasPrerequisites: setupArgs.hasPrerequisites,
            idfVersion: setupArgs.espIdfVersion,
            idfVersions: setupArgs.espIdfVersionsList,
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

  private async autoInstall(
    selectedIdfVersion: IEspIdfLink,
    pyPath: string,
    espIdfPath: string,
    idfContainerPath: string,
    mirror: IdfMirror,
    setupMode: SetupMode
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
          const pyCheck = await checkPythonPipExists(pyPath, __dirname);
          if (!pyCheck) {
            const containerNotFoundMsg = `${pyPath} is not valid. (ERROR_INVALID_PYTHON)`;
            Logger.infoNotify(containerNotFoundMsg);
            throw new Error(containerNotFoundMsg);
          }
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
            command: "setIdfVersion",
            idfVersion,
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
          if (setupMode === SetupMode.advanced) {
            this.panel.webview.postMessage({
              command: "goToCustomPage",
              installing: false,
              page: "/custom",
            });
            return;
          }
          const containerPath =
            process.platform === "win32"
              ? process.env.USERPROFILE
              : process.env.HOME;
          const toolsPath =
            (idfConf.readParameter("idf.toolsPath") as string) ||
            path.join(containerPath, ".espressif");
          await this.downloadEspIdfTools(
            idfPath,
            toolsPath,
            pyPath,
            progress,
            cancelToken
          );
        } catch (error) {
          if (error && error.message) {
            if (
              error.message.indexOf("ERROR_EXISTING_ESP_IDF") > -1 ||
              error.message.indexOf("ERROR_NON_EXISTING_CONTAINER") > -1
            ) {
              this.panel.webview.postMessage({
                command: "setEspIdfErrorStatus",
                errorMsg: error.message,
              });
              this.panel.webview.postMessage({
                command: "goToCustomPage",
                installing: false,
                page: "/autoinstall",
              });
              OutputChannel.appendLine(error.message);
              Logger.errorNotify(error.message, error);
              return;
            }
            if (error.message.indexOf("ERROR_INVALID_PYTHON")) {
              this.panel.webview.postMessage({
                command: "setPyExecErrorStatus",
                errorMsg: error.message,
              });
              this.panel.webview.postMessage({
                command: "goToCustomPage",
                installing: false,
                page: "/autoinstall",
              });
              this.panel.webview.postMessage({
                command: "setSetupMode",
                setupMode: SetupMode.express,
              });
              OutputChannel.appendLine(error.message);
              Logger.errorNotify(error.message, error);
              return;
            }
          }
          const errMsg = error.message
            ? error.message
            : "Error during Express install";
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

  private async downloadEspIdfTools(
    idfPath: string,
    toolsPath: string,
    pyPath: string,
    progress: vscode.Progress<{ message: string; increment?: number }>,
    cancelToken: vscode.CancellationToken
  ) {
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
    await this.createPyReqs(
      idfPath,
      toolsPath,
      pyPath,
      exportPaths,
      exportVars,
      progress,
      cancelToken
    );
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
          await this.downloadEspIdfTools(
            idfPath,
            toolsPath,
            pyPath,
            progress,
            cancelToken
          );
        } catch (error) {
          const errMsg = error.message
            ? error.message
            : "Error during ESP-IDF Tools download";
          OutputChannel.appendLine(errMsg);
          Logger.errorNotify(errMsg, error);
          OutputChannel.show();
          this.panel.webview.postMessage({
            command: "goToCustomPage",
            installing: false,
            page: "/",
          });
          this.panel.webview.postMessage({
            command: "setSetupMode",
            setupMode: SetupMode.express,
          });
        }
      }
    );
  }

  private async createPyReqs(
    idfPath: string,
    toolsPath: string,
    pyPath: string,
    exportPaths: string,
    exportVars: string,
    progress: vscode.Progress<{ message: string; increment?: number }>,
    cancelToken: vscode.CancellationToken
  ) {
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
    await saveSettings(idfPath, virtualEnvPath, exportPaths, exportVars);
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
  }

  private async installPyReqs(
    idfPath: string,
    toolsPath: string,
    pyPath: string,
    exportPaths: string,
    exportVars: string
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
          await this.createPyReqs(
            idfPath,
            toolsPath,
            pyPath,
            exportPaths,
            exportVars,
            progress,
            cancelToken
          );
        } catch (error) {
          const errMsg = error.message
            ? error.message
            : "Error during Python virtual env install";
          OutputChannel.appendLine(errMsg);
          Logger.errorNotify(errMsg, error);
          OutputChannel.show();
          this.panel.webview.postMessage({
            command: "goToCustomPage",
            installing: false,
            page: "/",
          });
          this.panel.webview.postMessage({
            command: "setSetupMode",
            setupMode: SetupMode.express,
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
