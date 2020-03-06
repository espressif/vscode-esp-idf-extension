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

import { ensureDir, constants } from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import * as idfConf from "../idfConfiguration";
import { IdfToolsManager } from "../idfToolsManager";
import { IMetadataFile, IPath, ITool } from "../ITool";
import { LocDictionary } from "../localizationDictionary";
import { Logger } from "../logger/logger";
import { OutputChannel } from "../logger/outputChannel";
import { PlatformInformation } from "../PlatformInformation";
import * as utils from "../utils";
import { createOnboardingHtml } from "./createOnboardingHtml";
import {
  downloadInstallIdfVersion,
  IEspIdfLink,
  saveIdfPathInMetadataFile,
} from "./espIdfDownload";
import { IOnboardingArgs } from "./onboardingInit";
import { checkPythonRequirements } from "./pythonReqsManager";
import { downloadToolsInIdfToolsPath } from "./toolsInstall";

const locDic = new LocDictionary("OnBoardingPanel");

export class OnBoardingPanel {
  public static currentPanel: OnBoardingPanel | undefined;

  public static createOrShow(
    extensionPath: string,
    onboardingArgs?: IOnboardingArgs
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;
    if (OnBoardingPanel.currentPanel) {
      OnBoardingPanel.currentPanel.panel.reveal(column);
    } else {
      OnBoardingPanel.currentPanel = new OnBoardingPanel(
        extensionPath,
        column || vscode.ViewColumn.One,
        onboardingArgs
      );
    }
  }

  public static postMessage(content: any) {
    if (OnBoardingPanel.currentPanel) {
      OnBoardingPanel.currentPanel.panel.webview.postMessage(content);
    }
  }

  public static isCreatedAndHidden(): boolean {
    return (
      OnBoardingPanel.currentPanel &&
      OnBoardingPanel.currentPanel.panel.visible === false
    );
  }

  private static readonly viewType = "onboarding";
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];
  private extensionPath: string;
  private idfToolsManager: IdfToolsManager;
  private confTarget: vscode.ConfigurationTarget =
    vscode.ConfigurationTarget.Global;
  private selectedWorkspaceFolder: vscode.WorkspaceFolder;
  private pythonSystemBinPath: string;
  private metadataJson: IMetadataFile;

  private constructor(
    extensionPath: string,
    column: vscode.ViewColumn,
    onboardingArgs: IOnboardingArgs
  ) {
    this.extensionPath = extensionPath;
    this.idfToolsManager = onboardingArgs.idfToolsManager;
    this.pythonSystemBinPath = onboardingArgs.pythonVersions[0];
    const onBoardingPanelTitle = locDic.localize(
      "onboarding.panelName",
      "IDF Onboarding"
    );
    this.panel = vscode.window.createWebviewPanel(
      OnBoardingPanel.viewType,
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
        path.join(extensionPath, "dist", "views", "onboarding-bundle.js")
      )
    );
    this.panel.webview.html = createOnboardingHtml(scriptPath);

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.panel.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case "command":
          this.panel.webview.postMessage({
            command: "command",
            value: "exampleValue",
          });
          break;
        case "updateConfigurationTarget":
          switch (message.confTarget) {
            case vscode.ConfigurationTarget.Global:
              this.confTarget = vscode.ConfigurationTarget.Global;
              break;
            case vscode.ConfigurationTarget.Workspace:
              this.confTarget = vscode.ConfigurationTarget.Workspace;
              if (utils.PreCheck.isWorkspaceFolderOpen()) {
                this.confTarget = vscode.ConfigurationTarget.Workspace;
              } else {
                this.panel.webview.postMessage({
                  command: "resetConfigurationTarget",
                  confTarget: vscode.ConfigurationTarget.Global,
                });
                vscode.window.showInformationMessage(
                  "No workspace is open. Please open a workspace first."
                );
              }
              break;
            case vscode.ConfigurationTarget.WorkspaceFolder:
              this.confTarget = vscode.ConfigurationTarget.Workspace;
              if (utils.PreCheck.isWorkspaceFolderOpen()) {
                this.confTarget = vscode.ConfigurationTarget.WorkspaceFolder;
                this.selectedWorkspaceFolder = vscode.workspace.workspaceFolders.find(
                  (f) => f.uri.fsPath === message.workspaceFolder
                );
              } else {
                this.panel.webview.postMessage({
                  command: "resetConfigurationTarget",
                  confTarget: vscode.ConfigurationTarget.Global,
                });
                vscode.window.showInformationMessage(
                  "No folder is open. Please open a folder first."
                );
              }
              break;
            default:
              break;
          }
          break;
        case "checkIdfPath":
          if (message.new_value) {
            const idfBinaryPath = path.join(
              message.new_value,
              "tools",
              "idf.py"
            );
            const doesIdfExist = utils.fileExists(idfBinaryPath);
            utils.getEspIdfVersion(message.new_value).then((idfVersion) => {
              this.panel.webview.postMessage({
                command: "response_check_idf_version",
                version: idfVersion,
              });
            });
            this.panel.webview.postMessage({
              command: "response_check_idf_path",
              doesIdfExists: doesIdfExist,
            });
          }
          break;
        case "saveNewIdfPath":
          if (message.idf_path) {
            idfConf.writeParameter(
              "idf.espIdfPath",
              message.idf_path,
              this.confTarget,
              this.selectedWorkspaceFolder
            );
            this.updateIdfToolsManager(message.idf_path);
            saveIdfPathInMetadataFile(message.idf_path);
          }
          break;
        case "checkIdfToolsForPaths":
          if (
            message.custom_paths &&
            message.custom_vars &&
            message.py_bin_path
          ) {
            this.idfToolsManager
              .checkToolsVersion(message.custom_paths)
              .then((dictTools) => {
                const pkgsNotFound = dictTools.filter(
                  (p) => p.doesToolExist === false
                );
                if (pkgsNotFound.length === 0) {
                  this.panel.webview.postMessage({
                    command: "set_tools_check_finish",
                  });
                }
                this.panel.webview.postMessage({
                  command: "respond_check_idf_tools_path",
                  dictToolsExist: dictTools,
                });
                const toolsNotFound = dictTools.filter(
                  (val) => val.doesToolExist === false
                );
                if (toolsNotFound.length === 0) {
                  idfConf.writeParameter(
                    "idf.customExtraPaths",
                    message.custom_paths,
                    this.confTarget,
                    this.selectedWorkspaceFolder
                  );
                }
                if (!utils.canAccessFile(message.py_bin_path, constants.R_OK)) {
                  const notAccessMsg = `${message.py_bin_path} is not accesible.`;
                  vscode.window.showErrorMessage(notAccessMsg);
                  this.panel.webview.postMessage({
                    command: "response_py_req_check",
                    py_req_log: notAccessMsg,
                  });
                  return;
                }
                checkPythonRequirements(
                  this.extensionPath,
                  this.selectedWorkspaceFolder,
                  message.py_bin_path
                );
              });
          } else {
            if (message.py_bin_path === "") {
              vscode.window.showInformationMessage(
                "Please fill all required inputs"
              );
            }
          }
          break;
        case "getRequiredToolsInfo":
          this.idfToolsManager.getRequiredToolsInfo().then((requiredTools) => {
            this.panel.webview.postMessage({
              command: "reply_required_tools_versions",
              requiredToolsVersions: requiredTools,
            });
          });
          break;
        case "downloadToolsInPath":
          if (message.idf_path && message.tools_path) {
            utils
              .dirExistPromise(message.tools_path)
              .then(async (doesDirExists: boolean) => {
                if (doesDirExists) {
                  await idfConf.writeParameter(
                    "idf.toolsPath",
                    message.tools_path,
                    this.confTarget,
                    this.selectedWorkspaceFolder
                  );
                } else {
                  if (message.tools_path.indexOf("~") > -1) {
                    vscode.window.showInformationMessage(
                      "Given path can't contain ~, please use absolute path."
                    );
                    return;
                  }
                  const selected = await vscode.window.showErrorMessage(
                    "Specified Directory doesn't exists. Create?",
                    { modal: true },
                    { title: "Yes", isCloseAffordance: false },
                    { title: "No", isCloseAffordance: false }
                  );
                  if (selected.title === "Yes") {
                    await ensureDir(message.tools_path).then(async () => {
                      await idfConf.writeParameter(
                        "idf.toolsPath",
                        message.tools_path,
                        this.confTarget,
                        this.selectedWorkspaceFolder
                      );
                    });
                  } else {
                    vscode.window.showInformationMessage(
                      "Please input a valid IDF Tools Directory"
                    );
                    return;
                  }
                }
                downloadToolsInIdfToolsPath(
                  message.idf_path,
                  this.idfToolsManager,
                  message.tools_path,
                  this.confTarget,
                  this.selectedWorkspaceFolder,
                  this.pythonSystemBinPath
                ).catch((reason) => {
                  OutputChannel.appendLine(reason);
                  Logger.info(reason);
                });
              });
          }
          break;
        case "getExamplesList":
          vscode.commands.executeCommand("examples.start");
          break;
        case "getPyVenvIdfToolsForVersion":
          if (message.idf && message.idf.path) {
            this.loadMetadataForIdfPath(message.idf.path);
          }
          break;
        case "checkPreviousAreValid":
          if (message.tools && message.idf && message.venv) {
            utils
              .validateToolsFromMetadata(message.idf.path, message.tools)
              .then(async (toolsResult) => {
                const requirements = path.join(
                  message.idf.path,
                  "requirements.txt"
                );
                const debugAdapterRequirements = path.join(
                  utils.extensionContext.extensionPath,
                  "esp_debug_adapter",
                  "requirements.txt"
                );
                let allToolsValid: boolean = true;
                for (const key of Object.keys(toolsResult)) {
                  if (!toolsResult[key]) {
                    allToolsValid = false;
                    Logger.infoNotify(`Bin path for ${key} is not valid.`);
                    OutputChannel.appendLine(
                      `Bin path for ${key} is not valid.`
                    );
                  }
                }
                await utils
                  .startPythonReqsProcess(
                    message.venv.path,
                    message.idf.path,
                    requirements
                  )
                  .then(async (pyReqLog) => {
                    const resultLog = `Checking Python requirements using ${message.venv.path}\n${pyReqLog}`;
                    OutputChannel.appendLine(resultLog);
                    Logger.info(resultLog);
                    await utils
                      .startPythonReqsProcess(
                        message.venv.path,
                        message.idf.path,
                        debugAdapterRequirements
                      )
                      .then((adapterReqLog) => {
                        const adapterResultLog = `Checking Debug Adapter requirements using ${message.venv.path}\n${adapterReqLog}`;
                        OutputChannel.appendLine(adapterResultLog);
                        Logger.info(adapterResultLog);
                        OnBoardingPanel.postMessage({
                          command: "response_py_req_check",
                          py_req_log: resultLog + adapterResultLog,
                        });
                        if (
                          pyReqLog.indexOf("are not satisfied") < 0 &&
                          adapterReqLog.indexOf("are not satisfied") < 0
                        ) {
                          OnBoardingPanel.postMessage({
                            command: "set_py_setup_finish",
                          });
                        }
                      });
                  });
                if (allToolsValid) {
                  this.panel.webview.postMessage({
                    command: "previous_tools_validation_done",
                  });
                }
              });
          }
          break;
        case "savePreviousSettings":
          if (message.tools && message.idf && message.venv) {
            idfConf.writeParameter("idf.espIdfPath", message.idf.path);
            const extraPaths = message.tools
              .reduce((prev, curr) => {
                return `${prev}${path.delimiter}${curr.path}`;
              }, "")
              .substr(1);
            idfConf.writeParameter("idf.customExtraPaths", extraPaths);
            idfConf.writeParameter("idf.pythonBinPath", message.venv.path);
          }
          break;
        case "saveEnvVars":
          if (message.custom_vars && message.custom_paths) {
            OutputChannel.appendLine("");
            Logger.info("");
            OutputChannel.appendLine(
              "The following paths would be added to env PATH"
            );
            Logger.info("The following paths would be added to env PATH");
            OutputChannel.appendLine(message.custom_paths);
            Logger.info(message.custom_paths);
            OutputChannel.appendLine("");
            Logger.info("");
            idfConf.writeParameter(
              "idf.customExtraPaths",
              message.custom_paths,
              this.confTarget,
              this.selectedWorkspaceFolder
            );
            idfConf.writeParameter(
              "idf.customExtraVars",
              JSON.stringify(message.custom_vars),
              this.confTarget,
              this.selectedWorkspaceFolder
            );
          }
          break;
        case "openEspIdfFolder":
          vscode.window
            .showOpenDialog({
              canSelectFolders: true,
              canSelectFiles: false,
              canSelectMany: false,
            })
            .then((selectedFolder: vscode.Uri[]) => {
              if (selectedFolder && selectedFolder.length > 0) {
                this.panel.webview.postMessage({
                  command: "response_selected_espidf_folder",
                  selected_folder: selectedFolder[0].fsPath,
                });
              } else {
                vscode.window.showInformationMessage("No folder selected");
              }
            });
          break;
        case "openToolsFolder":
          vscode.window
            .showOpenDialog({
              canSelectFolders: true,
              canSelectFiles: false,
              canSelectMany: false,
            })
            .then((selectedFolder: vscode.Uri[]) => {
              if (selectedFolder && selectedFolder.length > 0) {
                this.panel.webview.postMessage({
                  command: "response_selected_tools_folder",
                  selected_folder: selectedFolder[0].fsPath,
                });
              } else {
                vscode.window.showInformationMessage("No folder selected");
              }
            });
          break;
        case "downloadEspIdfVersion":
          if (message.selectedVersion && message.idfPath) {
            const idfVersion = message.selectedVersion as IEspIdfLink;
            downloadInstallIdfVersion(
              idfVersion,
              message.idfPath,
              this.confTarget,
              this.selectedWorkspaceFolder
            ).then(async () => {
              await saveIdfPathInMetadataFile(
                path.join(message.idfPath, "esp-idf")
              );
              await this.updateIdfToolsManager(
                path.join(message.idfPath, "esp-idf")
              );
            });
          }
          break;
        case "savePythonBinary":
          if (message.selectedPyBin) {
            if (!utils.fileExists(message.selectedPyBin)) {
              vscode.window.showInformationMessage("Python path doesn't exist");
              return;
            }
            const msg = `Saving ${message.selectedPyBin} to create python virtual environment.`;
            Logger.info(msg);
            OutputChannel.appendLine(msg);
            this.pythonSystemBinPath = message.selectedPyBin;
            this.panel.webview.postMessage({
              command: "set_py_sys_path_is_valid",
            });
          }
          break;
        case "saveShowOnboarding":
          if (message.showOnboarding !== undefined) {
            idfConf.writeParameter(
              "idf.showOnboardingOnInit",
              message.showOnboarding,
              vscode.ConfigurationTarget.Global
            );
            Logger.info(
              `Show onboarding on extension start? ${message.showOnboarding}`
            );
          }
          break;
        case "requestInitValues":
          this.sendInitialValues(onboardingArgs);
          break;
        default:
          break;
      }
    });
  }

  public dispose() {
    OnBoardingPanel.currentPanel = undefined;
    this.panel.dispose();
  }

  private async updateIdfToolsManager(newIdfPath: string) {
    const platformInfo = await PlatformInformation.GetPlatformInformation();
    const toolsJsonPath = await utils.getToolsJsonPath(newIdfPath);
    const toolsJson = JSON.parse(utils.readFileSync(toolsJsonPath));
    this.idfToolsManager = new IdfToolsManager(
      toolsJson,
      platformInfo,
      OutputChannel.init()
    );
  }

  private sendInitialValues(onboardingArgs: IOnboardingArgs) {
    // Send workspace folders
    let selected;
    if (utils.PreCheck.isWorkspaceFolderOpen()) {
      const folders = vscode.workspace.workspaceFolders.map(
        (f) => f.uri.fsPath
      );
      selected = vscode.workspace.workspaceFolders[0];
      this.panel.webview.postMessage({
        command: "loadWorkspaceFolders",
        folders: folders,
      });
    }
    // Give initial IDF_PATH
    const espIdfPath = idfConf.readParameter("idf.espIdfPath", selected);
    this.panel.webview.postMessage({
      command: "load_idf_path",
      idf_path: espIdfPath,
    });
    // Give initial IDF_TOOLS_PATH
    const idfToolsPath = idfConf.readParameter("idf.toolsPath", selected);
    this.panel.webview.postMessage({
      command: "load_idf_tools_path",
      idf_tools_path: idfToolsPath,
    });
    // Give initial download path for idf_path
    const idfDownloadPath =
      process.platform === "win32" ? process.env.USERPROFILE : process.env.HOME;
    this.panel.webview.postMessage({
      command: "load_idf_download_path",
      idf_path: idfDownloadPath,
    });

    // Initial Python Path
    const pyBinPath = idfConf.readParameter("idf.pythonBinPath") as string;
    this.panel.webview.postMessage({
      command: "load_python_bin_path",
      pythonBinPath: pyBinPath,
    });

    // Show onboarding on extension activate
    const showOnboardingOnInit = JSON.parse(
      idfConf.readParameter("idf.showOnboardingOnInit")
    );
    this.panel.webview.postMessage({
      command: "load_show_onboarding",
      show_onboarding_on_init: showOnboardingOnInit,
    });

    this.panel.webview.postMessage({
      command: "load_path_delimiter",
      pathDelimiter: path.delimiter,
    });

    // Give initial values of idf.customExtraPaths
    const customExtraPaths = idfConf.readParameter("idf.customExtraPaths");
    this.panel.webview.postMessage({
      command: "load_custom_paths",
      custom_paths: customExtraPaths,
    });

    // Initial ESP-IDF version list
    this.panel.webview.postMessage({
      command: "load_idf_versions",
      versions: onboardingArgs.espIdfVersionList,
    });
    this.panel.webview.postMessage({
      command: "load_git_version",
      gitVersion: onboardingArgs.gitVersion,
    });
    this.panel.webview.postMessage({
      command: "load_py_version_list",
      pyVersionList: onboardingArgs.pythonVersions,
    });

    const customVars = idfConf.readParameter("idf.customExtraVars");
    if (utils.isJson(customVars)) {
      this.panel.webview.postMessage({
        command: "load_custom_paths",
        custom_vars: JSON.parse(customVars),
      });
    } else {
      this.panel.webview.postMessage({
        command: "load_env_vars_def",
        env_vars: onboardingArgs.expectedEnvVars,
      });
    }

    if (onboardingArgs.metadataJson && this.metadataJson.idf) {
      this.metadataJson = onboardingArgs.metadataJson;
      const idfVersions = this.metadataJson.idf;
      this.panel.webview.postMessage({
        command: "load_idf_versions_metadata",
        idfVersions,
      });
      const selectedIdf = this.metadataJson.idf.find((idfMeta) => {
        return idfMeta.path === espIdfPath;
      });
      const selected = selectedIdf;
      this.panel.webview.postMessage({
        command: "load_selected_idf_version_metadata",
        selectedEspIdfVersionMetadata: selected,
      });
      this.loadMetadataForIdfPath(espIdfPath);
    }
  }

  private loadMetadataForIdfPath(idfPath: string) {
    utils.getEspIdfVersion(idfPath).then(async (idfVersion) => {
      if (this.metadataJson && this.metadataJson.venv) {
        const venvForIdfVersion = this.metadataJson.venv.filter(
          (pyEnv: IPath) => {
            return pyEnv.path.indexOf(idfVersion) > -1;
          }
        );
        this.panel.webview.postMessage({
          command: "load_venv_versions_metadata",
          venvVersions: venvForIdfVersion,
        });
        const selectedPyBinPath = idfConf.readParameter(
          "idf.pythonBinPath"
        ) as string;
        const selectedPyBin = venvForIdfVersion.find((pyEnv) => {
          return pyEnv.path === selectedPyBinPath;
        });
        this.panel.webview.postMessage({
          command: "load_selected_venv_version_metadata",
          selectedVenvVersionMetadata: selectedPyBin,
        });
        const platformInfo = await PlatformInformation.GetPlatformInformation();
        const toolsJsonPath = await utils.getToolsJsonPath(idfPath);
        await utils.readJson(toolsJsonPath).then(async (toolsJson) => {
          const previousToolsManager = new IdfToolsManager(
            toolsJson,
            platformInfo,
            OutputChannel.init()
          );
          const toolsMetadata = await previousToolsManager
            .getPackageList()
            .then((pkgs) => {
              return pkgs.map((pkg) => {
                const versionToUse = previousToolsManager.getVersionToUse(pkg);
                const toolMeta = this.metadataJson.tools.find((tool) => {
                  return (
                    tool.version === versionToUse && tool.name === pkg.name
                  );
                });
                return {
                  name: pkg.name,
                  path: toolMeta.path,
                  version: toolMeta.version,
                  id: toolMeta.id,
                } as ITool;
              });
            });
          this.panel.webview.postMessage({
            command: "load_tools_versions_metadata",
            toolsVersions: toolsMetadata,
          });
        });
      }
    });
  }
}
