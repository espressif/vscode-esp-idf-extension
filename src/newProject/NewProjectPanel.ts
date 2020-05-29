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

import { ensureDir, copy } from "fs-extra";
import { basename, delimiter, join } from "path";
import * as vscode from "vscode";
import { createNewProjectHtml } from "./createNewProjectHtml";
import * as idfConf from "../idfConfiguration";
import { LocDictionary } from "../localizationDictionary";
import { INewProjectArgs } from "./newProjectInit";
import { getExamplesList, IExample } from "../examples/Examples";
import { getToolsInMetadataForIdfPath, IPath, ITool } from "../ITool";
import { IMetadataFile } from "../Metadata";
import * as utils from "../utils";
import { Logger } from "../logger/logger";
import { OutputChannel } from "../logger/outputChannel";
import { IComponent } from "../espIdf/idfComponent/IdfComponent";

const locDictionary = new LocDictionary("NewProjectPanel");

export class NewProjectPanel {
  public static currentPanel: NewProjectPanel | undefined;

  public static createOrShow(
    extensionPath: string,
    newProjectArgs?: INewProjectArgs
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : vscode.ViewColumn.One;
    if (NewProjectPanel.currentPanel) {
      NewProjectPanel.currentPanel.panel.reveal(column);
    } else {
      NewProjectPanel.currentPanel = new NewProjectPanel(
        extensionPath,
        newProjectArgs,
        column
      );
    }
  }

  public static isCreatedAndHidden(): boolean {
    return (
      NewProjectPanel.currentPanel &&
      !NewProjectPanel.currentPanel.panel.visible
    );
  }

  private static readonly viewType = "newProjectWizard";
  private readonly panel: vscode.WebviewPanel;
  private extensionPath: string;

  private constructor(
    extensionPath: string,
    newProjectArgs: INewProjectArgs,
    column: vscode.ViewColumn
  ) {
    this.extensionPath = extensionPath;
    const newProjectTitle = locDictionary.localize(
      "newProject.panelName",
      "New Project Wizard"
    );
    this.panel = vscode.window.createWebviewPanel(
      NewProjectPanel.viewType,
      newProjectTitle,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(join(extensionPath, "dist", "views")),
        ],
      }
    );
    this.panel.webview.html = createNewProjectHtml(extensionPath);

    this.panel.onDidDispose(() => this.dispose(), null);

    this.panel.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case "createProject":
          if (
            message.components &&
            message.idf &&
            message.template &&
            message.tools &&
            message.venv
          ) {
            this.createProject(
              message.components,
              message.idf,
              message.template,
              message.tools,
              message.venv
            );
          }
          break;
        case "checkIsValid":
          if (message.idf && message.tools && message.venv) {
            this.checkSettings(message.idf, message.tools, message.venv);
          }
          break;
        case "loadExamples":
          if (message.idf_path) {
            const examplesList = getExamplesList(message.idf_path);
            this.panel.webview.postMessage({
              command: "load_examples",
              examples: examplesList,
            });
          }
          break;
        case "loadComponent":
          vscode.window
            .showOpenDialog({
              canSelectFolders: true,
              canSelectFiles: false,
              canSelectMany: false,
            })
            .then((selectedFolder) => {
              if (selectedFolder) {
                const newComponent: IComponent = {
                  name: basename(selectedFolder[0].fsPath),
                  path: selectedFolder[0].fsPath,
                };
                this.panel.webview.postMessage({
                  command: "component_list_add_path",
                  new_component: newComponent,
                });
              }
            });
          break;
        case "getIdfVersion":
          if (message.idf_path) {
            utils
              .getEspIdfVersion(message.idf_path.path)
              .then((idfVersion) => {
                this.panel.webview.postMessage({
                  command: "load_current_idf_version",
                  idfVersion,
                  idfPath: message.idf_path,
                });
                this.loadToolsVenvForIdf(
                  newProjectArgs.metadata,
                  message.idf_path
                );
              })
              .catch((reason) => {
                OutputChannel.appendLine(reason);
                Logger.info(reason);
              });
          }
        case "requestInitValues":
          if (
            newProjectArgs &&
            newProjectArgs.metadata &&
            newProjectArgs.metadata.idf &&
            newProjectArgs.metadata.idf.length > 0 &&
            newProjectArgs.metadata.venv &&
            newProjectArgs.metadata.venv.length > 0 &&
            newProjectArgs.metadata.tools &&
            newProjectArgs.metadata.tools.length > 0
          ) {
            this.loadInitialMetadata(newProjectArgs.metadata).catch(
              (reason) => {
                OutputChannel.appendLine(reason);
                Logger.info(reason);
              }
            );
          } else {
            Logger.infoNotify("No values available in metadata.json");
          }
          break;
        default:
          break;
      }
    });
  }

  public dispose() {
    NewProjectPanel.currentPanel = undefined;
    this.panel.dispose();
  }

  public async loadInitialMetadata(metadata: IMetadataFile) {
    try {
      const espIdfPath =
        idfConf.readParameter("idf.espIdfPath") || process.env.IDF_PATH;
      if (typeof espIdfPath === "undefined") {
        throw new Error("IDF_PATH is not defined");
      }
      const selectedIdf =
        metadata.idf.find((idfVersion) => idfVersion.path === espIdfPath) ||
        metadata.idf[0];
      await this.loadToolsVenvForIdf(metadata, selectedIdf);
    } catch (error) {
      Logger.errorNotify("Error loading initial values in New Project", error);
    }
  }

  public async loadToolsVenvForIdf(
    metadata: IMetadataFile,
    selectedIdf: IPath
  ) {
    this.panel.webview.postMessage({
      command: "load_idf_versions",
      idfVersions: metadata.idf,
      selectedIdf,
    });
    const idfVersion = await utils.getEspIdfVersion(selectedIdf.path);
    this.panel.webview.postMessage({
      command: "load_current_idf_version",
      idfVersion,
    });
    const pyVenvList = metadata.venv.filter(
      (venv) => venv.path.indexOf(idfVersion) > -1
    );
    const pyBinPath = idfConf.readParameter("idf.pythonBinPath") as string;
    const selectedVenv =
      pyVenvList.find((venv) => venv.path === pyBinPath) || pyVenvList[0];
    this.panel.webview.postMessage({
      command: "load_py_venvs",
      pyVenvList,
      selectedVenv,
    });
    const toolsList = await getToolsInMetadataForIdfPath(
      selectedIdf.path,
      metadata.tools
    );
    this.panel.webview.postMessage({
      command: "load_tools_list",
      tools: toolsList,
    });
  }

  public async checkSettings(idf: IPath, tools: ITool[], venv: IPath) {
    const toolsResult = await utils.validateToolsFromMetadata(idf.path, tools);
    const idfPyReqs = join(idf.path, "requirements.txt");
    const debugAdapterPyReqs = join(
      this.extensionPath,
      "esp_debug_adapter",
      "requirements.txt"
    );
    let allIsValid: boolean = true;
    for (const tKey of Object.keys(toolsResult)) {
      if (!toolsResult[tKey]) {
        allIsValid = false;
        Logger.infoNotify(`Bin path is not valid for ${tKey}`);
        OutputChannel.appendLine(`Bin path is not valid for ${tKey}`);
      }
    }
    const idfPyLog = await utils.startPythonReqsProcess(
      venv.path,
      idf.path,
      idfPyReqs
    );
    const resultLog = `Checking Python requirements using ${venv.path}\n${idfPyLog}`;
    OutputChannel.appendLine(resultLog);
    Logger.info(resultLog);
    const debugPyLog = await utils.startPythonReqsProcess(
      venv.path,
      idf.path,
      debugAdapterPyReqs
    );
    const adapterResultLog = `Checking Debug Adapter requirements using ${venv.path}\n${debugPyLog}`;
    OutputChannel.appendLine(adapterResultLog);
    Logger.info(adapterResultLog);
    if (
      idfPyLog.indexOf("are not satisfied") > -1 &&
      debugPyLog.indexOf("are not satisfied") > -1
    ) {
      allIsValid = false;
    }
    this.panel.webview.postMessage({
      command: "idf_tools_check_done",
      allIsValid,
    });
  }

  public async createProject(
    components: IComponent[],
    idf: IPath,
    template: IExample,
    tools: ITool[],
    venv: IPath
  ) {
    const selectedFolder = await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
      openLabel: "Choose container directory",
    });
    if (!selectedFolder) {
      vscode.window.showInformationMessage("No folder selected");
      return;
    }
    const projectName = await vscode.window.showInputBox({
      placeHolder: "Enter project name",
    });
    if (!projectName) {
      vscode.window.showInformationMessage("No name selected");
      return;
    }
    const newProjectPath = join(selectedFolder[0].fsPath, projectName);
    await ensureDir(newProjectPath, { mode: 0o775 });
    if (template && template.path !== "") {
      await utils.copyFromSrcProject(template.path, newProjectPath);
    } else {
      const boilerplatePath = join(
        this.extensionPath,
        "templates",
        "boilerplate"
      );
      await utils.copyFromSrcProject(boilerplatePath, newProjectPath);
    }
    const settingsJsonPath = join(newProjectPath, ".vscode", "settings.json");
    const settingsJson = await utils.readJson(settingsJsonPath);
    settingsJson["idf.espIdfPath"] = idf.path;
    settingsJson["idf.pythonBinPath"] = venv.path;
    const extraPaths = tools
      .reduce((prev, curr) => {
        return `${prev}${delimiter}${curr.path}`;
      }, "")
      .substr(1);
    const extraVars = {};
    for (const tool of tools) {
      Object.keys(tool.env).forEach((envVar) => {
        extraVars[envVar] = tool.env[envVar];
      });
    }
    const toolsDir = venv.path.substr(0, venv.path.indexOf("python_env") - 1);
    settingsJson["idf.customExtraPaths"] = extraPaths;
    settingsJson["idf.customExtraVars"] = JSON.stringify(extraVars);
    settingsJson["idf.toolsPath"] = toolsDir;

    await utils.writeJson(settingsJsonPath, settingsJson);

    if (components && components.length > 0) {
      const componentsPath = join(newProjectPath, "components");
      await ensureDir(componentsPath, { mode: 0o775 });
      for (const comp of components) {
        const compPath = join(componentsPath, comp.name);
        await ensureDir(compPath, { mode: 0o775 });
        await copy(comp.path, compPath);
      }
    }

    vscode.commands.executeCommand(
      "vscode.openFolder",
      vscode.Uri.file(newProjectPath)
    );
  }
}
