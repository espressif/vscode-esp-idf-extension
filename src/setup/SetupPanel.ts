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

import { ISetupInitArgs } from "./setupInit";
import {
  IEspIdfLink,
  IEspIdfTool,
  SetupMode,
  StatusType,
} from "../views/setup/types";
import { ESP } from "../config";
import * as idfConf from "../idfConfiguration";
import { ensureDir } from "fs-extra";
import path from "path";
import {
  CancellationToken,
  ConfigurationTarget,
  Disposable,
  ExtensionContext,
  Progress,
  ProgressLocation,
  StatusBarItem,
  Uri,
  ViewColumn,
  WebviewPanel,
  commands,
  l10n,
  window,
} from "vscode";
import { expressInstall } from "./espIdfDownloadStep";
import { IdfToolsManager } from "../idfToolsManager";
import { OutputChannel } from "../logger/outputChannel";
import { Logger } from "../logger/logger";
import { createPyReqs } from "./pyReqsInstallStep";
import { downloadIdfTools } from "./toolsDownloadStep";
import { installIdfGit, installIdfPython } from "./embedGitPy";
import { getOpenOcdRules } from "./addOpenOcdRules";
import {
  checkSpacesInPath,
  getEspIdfFromCMake,
  canAccessFile,
  compareVersion,
} from "../utils";
import { useIdfSetupSettings } from "./setupValidation/espIdfSetup";

export class SetupPanel {
  public static currentPanel: SetupPanel | undefined;

  public static createOrShow(
    context: ExtensionContext,
    setupArgs?: ISetupInitArgs
  ) {
    const column = window.activeTextEditor
      ? window.activeTextEditor.viewColumn
      : ViewColumn.One;
    if (SetupPanel.currentPanel) {
      SetupPanel.currentPanel.panel.reveal(column);
    } else {
      SetupPanel.currentPanel = new SetupPanel(context, column, setupArgs);
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
  private readonly panel: WebviewPanel;
  private disposables: Disposable[] = [];

  constructor(
    private context: ExtensionContext,
    column: ViewColumn,
    setupArgs: ISetupInitArgs
  ) {
    const setupPanelTitle = l10n.t("ESP-IDF Setup");

    this.panel = window.createWebviewPanel(
      SetupPanel.viewType,
      setupPanelTitle,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          Uri.file(path.join(this.context.extensionPath, "dist", "views")),
        ],
      }
    );
    this.panel.iconPath = Uri.file(
      path.join(context.extensionPath, "media", "espressif_icon.png")
    );

    const scriptPath = this.panel.webview.asWebviewUri(
      Uri.file(
        path.join(context.extensionPath, "dist", "views", "setup-bundle.js")
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
            await this.checkRequiredTools(
              message.espIdf,
              JSON.parse(message.toolsPath),
              setupArgs.onReqPkgs
            );
          }
          break;
        case "installEspIdf":
          if (
            message.espIdfContainer &&
            message.selectedEspIdfVersion &&
            message.toolsPath &&
            message.saveScope &&
            typeof message.selectedPyPath !== undefined &&
            typeof message.manualEspIdfPath !== undefined &&
            typeof message.mirror !== undefined &&
            typeof message.setupMode !== undefined
          ) {
            if (
              message.selectedEspIdfVersion &&
              message.selectedEspIdfVersion.filename !== "manual" &&
              message.espIdfContainer === defaultEspIdfPathContainer
            ) {
              await ensureDir(defaultEspIdfPathContainer);
            }
            await this.autoInstall(
              message.toolsPath,
              JSON.parse(message.selectedEspIdfVersion),
              message.selectedPyPath,
              message.manualEspIdfPath,
              message.espIdfContainer,
              message.mirror,
              message.saveScope,
              message.setupMode,
              context,
              setupArgs.espIdfStatusBar,
              setupArgs.workspaceFolder,
              setupArgs.onReqPkgs
            );
          }
          break;
        case "installEspIdfTools":
          if (
            message.espIdf &&
            message.pyPath &&
            message.toolsPath &&
            message.saveScope &&
            typeof message.mirror !== undefined
          ) {
            await this.installEspIdfTools(
              message.espIdf,
              message.pyPath,
              message.toolsPath,
              setupArgs.gitPath,
              message.mirror,
              message.saveScope,
              setupArgs.workspaceFolder,
              context,
              setupArgs.espIdfStatusBar,
              setupArgs.onReqPkgs
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
            downloadMirror: setupArgs.downloadMirror,
            espIdfContainer: defaultEspIdfPathContainer,
            espIdf: setupArgs.espIdfPath,
            extensionVersion: setupArgs.extensionVersion,
            espToolsPath: setupArgs.espToolsPath,
            gitVersion: setupArgs.gitVersion,
            hasPrerequisites: setupArgs.hasPrerequisites,
            idfVersions: setupArgs.espIdfVersionsList,
            idfTags: setupArgs.espIdfTagsList,
            idfSetups: setupArgs.existingIdfSetups,
            pathSep,
            platform: process.platform,
            pyVersionList: setupArgs.pythonVersions,
            saveScope: setupArgs.saveScope,
          });
          break;
        case "saveCustomSettings":
          if (
            message.espIdfPath &&
            message.toolsPath &&
            message.pyBinPath &&
            message.tools &&
            message.saveScope
          ) {
            this.panel.webview.postMessage({
              command: "updateEspIdfToolsStatus",
              status: StatusType.installed,
            });
            await this.installPyReqs(
              message.espIdfPath,
              message.toolsPath,
              message.pyBinPath,
              setupArgs.gitPath,
              message.saveScope,
              context,
              setupArgs.workspaceFolder,
              setupArgs.espIdfStatusBar
            );
          }
          break;
        case "useIdfSetup":
          if (
            typeof message.selectedIdfSetup !== undefined &&
            message.saveScope
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
            SetupPanel.postMessage({
              command: "setEspIdfErrorStatus",
              errorMsg: `ESP-IDF is installed in ${
                setupArgs.existingIdfSetups[message.selectedIdfSetup].idfPath
              }`,
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
            await useIdfSetupSettings(
              setupArgs.existingIdfSetups[message.selectedIdfSetup],
              message.saveScope,
              setupArgs.workspaceFolder,
              setupArgs.espIdfStatusBar
            );
            this.panel.webview.postMessage({
              command: "setIsInstalled",
              isInstalled: true,
            });
            await this.getOpenOcdRulesPath();
          }
          break;
        case "newProject":
          await commands.executeCommand("espIdf.newProject.start");
          break;
        case "importProject":
          await commands.executeCommand("espIdf.importProject");
          break;
        case "showExamples":
          await commands.executeCommand("espIdf.examples.start");
          break;
        case "exploreComponents":
          await commands.executeCommand("esp.component-manager.ui.show");
          break;
        case "canAccessFile":
          if (message.path) {
            const pathIdfPy = path.join(message.path, "tools", "idf.py");
            const fileExists = await canAccessFile(pathIdfPy);
            if (!fileExists) {
              this.panel.webview.postMessage({
                command: "canAccessFileResponse",
                path: message.path,
                exists: fileExists,
              });
            } else {
              let versionEspIdf;
              if (
                message.currentVersion &&
                typeof message.currentVersion === "string"
              ) {
                versionEspIdf = message.currentVersion;
              } else {
                versionEspIdf = await getEspIdfFromCMake(message.path);
              }
              // compareVersion returns a negative value if versionEspIdf is less than "5.0"
              const noWhiteSpaceSupport =
                compareVersion(versionEspIdf, "5.0") < 0;
              const hasWhitespace = /\s/.test(message.path);
              this.panel.webview.postMessage({
                command: "canAccessFileResponse",
                path: message.path,
                exists: fileExists,
                noWhiteSpaceSupport,
                hasWhitespace,
              });
            }
          }
          break;
        default:
          break;
      }
    });

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  setupErrHandler(error: Error) {
    const errMsg =
      error && error.message ? error.message : "Error during ESP-IDF setup";
    if (
      errMsg.indexOf("ERROR_EXISTING_ESP_IDF") !== -1 ||
      errMsg.indexOf("IDF_PATH_WITH_SPACES") !== -1 ||
      errMsg.indexOf("IDF_TOOLS_PATH_WITH_SPACES") !== -1 ||
      errMsg.indexOf("ERROR_SAME_IDF_PATH_AND__IDF_TOOLS_PATH") !== -1
    ) {
      SetupPanel.postMessage({
        command: "setEspIdfErrorStatus",
        errorMsg: error.message,
      });
    } else if (
      errMsg.indexOf("ERROR_INVALID_PYTHON") !== -1 ||
      errMsg.indexOf("ERROR_INVALID_PIP") !== -1 ||
      errMsg.indexOf("ERROR_INVALID_VENV") !== -1 ||
      errMsg.indexOf("PYTHON_BIN_PATH_WITH_SPACES") !== -1
    ) {
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
    Logger.errorNotify(errMsg, error, "SetupPanel error handler");
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
    mirror: ESP.IdfMirror,
    saveScope: ConfigurationTarget,
    setupMode: SetupMode,
    context: ExtensionContext,
    espIdfStatusBar: StatusBarItem,
    workspaceFolderUri: Uri,
    onReqPkgs?: string[]
  ) {
    const notificationMode = idfConf.readParameter(
      "idf.notificationMode"
    ) as string;
    const progressLocation =
      notificationMode === idfConf.NotificationMode.All ||
      notificationMode === idfConf.NotificationMode.Notifications
        ? ProgressLocation.Notification
        : ProgressLocation.Window;
    return await window.withProgress(
      {
        location: progressLocation,
        title: "ESP-IDF Setup:",
        cancellable: true,
      },
      async (
        progress: Progress<{ message: string; increment?: number }>,
        cancelToken: CancellationToken
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
            let idfVersion = "";
            if (selectedIdfVersion.filename === "manual") {
              idfVersion = await getEspIdfFromCMake(espIdfPath);
            } else if (selectedIdfVersion.filename === "master") {
              idfVersion = "5.1";
            } else {
              const matches = selectedIdfVersion.name
                .split(" ")[0]
                .match(/v(.+)/);
              if (matches && matches.length) {
                idfVersion = matches[1];
              } else {
                idfVersion = "5.0";
              }
            }
            const embedPaths = await this.installEmbedPyGit(
              toolsPath,
              idfVersion,
              progress,
              cancelToken
            );
            idfGitPath = embedPaths.idfGitPath;
            idfPythonPath = embedPaths.idfPythonPath;
          }
          const idfPathToCheck =
            selectedIdfVersion.filename === "manual"
              ? espIdfPath
              : idfContainerPath;
          this.checkSpacesInPaths(toolsPath);
          if (idfPathToCheck === toolsPath) {
            const idfPathSameIdfToolsPathMsg = `IDF_PATH and IDF_TOOLS_PATH can't be the same. Please use another location. (ERROR_SAME_IDF_PATH_AND__IDF_TOOLS_PATH)`;
            throw new Error(idfPathSameIdfToolsPathMsg);
          }
          await expressInstall(
            selectedIdfVersion,
            idfPythonPath,
            espIdfPath,
            idfContainerPath,
            toolsPath,
            mirror,
            saveScope,
            setupMode,
            context,
            espIdfStatusBar,
            workspaceFolderUri,
            idfGitPath,
            progress,
            cancelToken,
            onReqPkgs
          );
        } catch (error) {
          this.setupErrHandler(error);
        }
      }
    );
  }

  private async checkRequiredTools(
    idfPath: string,
    toolsInfo: IEspIdfTool[],
    onReqPkgs?: string[]
  ) {
    const toolsManager = await IdfToolsManager.createIdfToolsManager(idfPath);
    const pathToVerify = toolsInfo
      .reduce((prev, curr, i) => {
        return prev + path.delimiter + curr.path;
      }, "")
      .slice(1);

    const foundVersions = await toolsManager.verifyPackages(
      pathToVerify,
      onReqPkgs
    );
    const updatedToolsInfo = toolsInfo.map((tool) => {
      const isToolVersionCorrect =
        tool.expected.indexOf(foundVersions[tool.name]) > -1 ||
        (foundVersions[tool.name] &&
          foundVersions[tool.name] === "No command version");
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

  private async installEspIdfTools(
    idfPath: string,
    pyPath: string,
    toolsPath: string,
    gitPath: string,
    mirror: ESP.IdfMirror,
    saveScope: ConfigurationTarget,
    workspaceFolderUri: Uri,
    context: ExtensionContext,
    espIdfStatusBar: StatusBarItem,
    onReqPkgs?: string[]
  ) {
    const notificationMode = idfConf.readParameter(
      "idf.notificationMode"
    ) as string;
    const progressLocation =
      notificationMode === idfConf.NotificationMode.All ||
      notificationMode === idfConf.NotificationMode.Notifications
        ? ProgressLocation.Notification
        : ProgressLocation.Window;
    return await window.withProgress(
      {
        location: progressLocation,
        title: "ESP-IDF Tools Setup:",
        cancellable: true,
      },
      async (
        progress: Progress<{ message: string; increment?: number }>,
        cancelToken: CancellationToken
      ) => {
        try {
          SetupPanel.postMessage({
            command: "goToCustomPage",
            installing: true,
            page: "/status",
          });
          let idfPythonPath = pyPath,
            idfGitPath = gitPath || "/usr/bin/git";
          if (process.platform === "win32") {
            const idfVersion = await getEspIdfFromCMake(idfPath);
            const embedPaths = await this.installEmbedPyGit(
              toolsPath,
              idfVersion,
              progress,
              cancelToken
            );
            idfGitPath = embedPaths.idfGitPath;
            idfPythonPath = embedPaths.idfPythonPath;
          }
          this.checkSpacesInPaths(toolsPath);
          await downloadIdfTools(
            idfPath,
            toolsPath,
            idfPythonPath,
            idfGitPath,
            mirror,
            saveScope,
            workspaceFolderUri,
            context,
            espIdfStatusBar,
            progress,
            cancelToken,
            onReqPkgs
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
    gitPath: string,
    saveScope: ConfigurationTarget,
    context: ExtensionContext,
    workspaceFolderUri: Uri,
    espIdfStatusBar: StatusBarItem
  ) {
    const notificationMode = idfConf.readParameter(
      "idf.notificationMode"
    ) as string;
    const progressLocation =
      notificationMode === idfConf.NotificationMode.All ||
      notificationMode === idfConf.NotificationMode.Notifications
        ? ProgressLocation.Notification
        : ProgressLocation.Window;
    return await window.withProgress(
      {
        location: progressLocation,
        title: "ESP-IDF Python Requirements:",
        cancellable: true,
      },
      async (
        progress: Progress<{ message: string; increment?: number }>,
        cancelToken: CancellationToken
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
            gitPath,
            saveScope,
            context,
            progress,
            cancelToken,
            workspaceFolderUri,
            espIdfStatusBar
          );
        } catch (error) {
          this.setupErrHandler(error);
        }
      }
    );
  }

  private async installEmbedPyGit(
    toolsPath: string,
    idfVersion: string,
    progress: Progress<{ message: string; increment?: number }>,
    cancelToken: CancellationToken
  ) {
    const idfGitPath = await installIdfGit(toolsPath, progress, cancelToken);
    SetupPanel.postMessage({
      command: "updateIdfGitStatus",
      status: StatusType.installed,
    });
    const idfPythonPath = await installIdfPython(
      toolsPath,
      idfVersion,
      progress,
      cancelToken
    );
    SetupPanel.postMessage({
      command: "updateIdfPythonStatus",
      status: StatusType.installed,
    });
    await idfConf.writeParameter(
      "idf.gitPath",
      idfGitPath,
      ConfigurationTarget.Global
    );
    return { idfPythonPath, idfGitPath };
  }

  private async getOpenOcdRulesPath() {
    try {
      await getOpenOcdRules(Uri.file(this.context.extensionPath));
    } catch (error) {
      this.setupErrHandler(error);
    }
  }

  private checkSpacesInPaths(idfToolsPath: string) {
    const doesIdfToolsPathHasSpaces = checkSpacesInPath(idfToolsPath);
    let pathHasSpaces = "";
    if (doesIdfToolsPathHasSpaces) {
      pathHasSpaces = `${idfToolsPath} has spaces. Use another location. (IDF_TOOLS_PATH_WITH_SPACES)`;
    }
    if (pathHasSpaces) {
      OutputChannel.appendLine(pathHasSpaces);
      Logger.infoNotify(pathHasSpaces);
      throw new Error(pathHasSpaces);
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
    } else {
      window.showInformationMessage("No folder selected");
    }
  }

  private async openFile() {
    const selectedFolder = await window.showOpenDialog({
      canSelectFolders: false,
      canSelectFiles: true,
      canSelectMany: false,
    });
    if (selectedFolder && selectedFolder.length > 0) {
      return selectedFolder[0].fsPath;
    } else {
      window.showInformationMessage("No folder selected");
    }
  }

  private createSetupHtml(scriptPath: Uri): string {
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
