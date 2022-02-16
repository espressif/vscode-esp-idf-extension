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
import * as path from "path";
import * as vscode from "vscode";
import { Logger } from "../logger/logger";
import { OutputChannel } from "../logger/outputChannel";
import { LocDictionary } from "../localizationDictionary";
import { INewProjectArgs } from "./newProjectInit";
import { IComponent } from "../espIdf/idfComponent/IdfComponent";
import { copy, ensureDir, readFile, writeJSON } from "fs-extra";
import * as utils from "../utils";
import { IExample } from "../examples/Example";
import * as idfConf from "../idfConfiguration";
import { setCurrentSettingsInTemplate } from "./utils";

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
  private _disposables: vscode.Disposable[] = [];

  private constructor(
    extensionPath: string,
    newProjectArgs: INewProjectArgs,
    column: vscode.ViewColumn
  ) {
    this.extensionPath = extensionPath;
    const newProjectTitle = locDictionary.localize(
      "newProject.panelName",
      "New Project"
    );
    let localResourceRoots: vscode.Uri[] = [];
    localResourceRoots.push(
      vscode.Uri.file(path.join(this.extensionPath, "dist", "views"))
    );
    if (newProjectArgs.espAdfPath) {
      localResourceRoots.push(vscode.Uri.file(newProjectArgs.espAdfPath));
    }
    if (newProjectArgs.espIdfPath) {
      localResourceRoots.push(vscode.Uri.file(newProjectArgs.espIdfPath));
    }
    if (newProjectArgs.espMdfPath) {
      localResourceRoots.push(vscode.Uri.file(newProjectArgs.espMdfPath));
    }
    this.panel = vscode.window.createWebviewPanel(
      NewProjectPanel.viewType,
      newProjectTitle,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots,
      }
    );

    this.panel.iconPath = vscode.Uri.file(
      path.join(extensionPath, "media", "espressif_icon.png")
    );

    const scriptPath = this.panel.webview.asWebviewUri(
      vscode.Uri.file(
        path.join(this.extensionPath, "dist", "views", "newProject-bundle.js")
      )
    );
    this.panel.webview.html = this.createHtml(scriptPath);

    const containerPath =
      process.platform === "win32" ? process.env.USERPROFILE : process.env.HOME;

    this.panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "createProject":
          if (
            message.components &&
            message.containerFolder &&
            message.openOcdConfigFiles &&
            message.port &&
            message.projectName &&
            message.target &&
            message.template
          ) {
            this.createProject(
              message.components,
              message.target,
              message.openOcdConfigFiles,
              message.port,
              message.containerFolder,
              message.projectName,
              message.template
            );
          }
          break;
        case "getTemplateDetail":
          if (message.path) {
            await this.getTemplateDetail(message.path);
          }
          break;
        case "loadComponent":
          let selectedFolder = await this.openFolder();
          if (selectedFolder) {
            const newComponent: IComponent = {
              name: path.basename(selectedFolder),
              path: selectedFolder,
            };
            this.panel.webview.postMessage({
              command: "addComponentPath",
              component: newComponent,
            });
          }
          break;
        case "openProjectDirectory":
          let selectedProjectDir = await this.openFolder();
          if (selectedProjectDir) {
            this.panel.webview.postMessage({
              command: "setContainerDirectory",
              projectDirectory: selectedProjectDir,
            });
          }
          break;
        case "requestInitValues":
          if (
            newProjectArgs &&
            newProjectArgs.targetList &&
            newProjectArgs.targetList.length > 0 &&
            newProjectArgs.serialPortList &&
            newProjectArgs.serialPortList.length > 0
          ) {
            const defConfigFiles =
              newProjectArgs.boards && newProjectArgs.boards.length > 0
                ? newProjectArgs.boards[0].configFiles
                : newProjectArgs.targetList[0].configFiles;
            this.panel.webview.postMessage({
              boards: newProjectArgs.boards,
              command: "initialLoad",
              containerDirectory: containerPath,
              projectName: "project-name",
              serialPortList: newProjectArgs.serialPortList,
              targetList: newProjectArgs.targetList,
              openOcdConfigFiles: defConfigFiles,
              templates: newProjectArgs.templates,
            });
          }
          break;
        default:
          break;
      }
    });

    this.panel.onDidDispose(
      () => {
        NewProjectPanel.currentPanel = undefined;
      },
      null,
      this._disposables
    );
  }

  private async createProject(
    components: IComponent[],
    idfTarget: string,
    openOcdConfigs: string,
    port: string,
    projectDirectory: string,
    projectName: string,
    template: IExample
  ) {
    const newProjectPath = path.join(projectDirectory, projectName);
    let isSkipped = false;
    await vscode.window.withProgress(
      {
        cancellable: true,
        location: vscode.ProgressLocation.Notification,
        title: "ESP-IDF: Create project",
      },
      async (
        progress: vscode.Progress<{ message: string; increment: number }>,
        token: vscode.CancellationToken
      ) => {
        try {
          const espIdfPath = idfConf.readParameter("idf.espIdfPath") as string;
          const gitPath = idfConf.readParameter("idf.gitPath") || "git";
          const version = await utils.getEspIdfVersion(espIdfPath, gitPath);
          if (/\s/g.test(projectName) && Number(version) < 5) {
            let versionMessage = `Detected a whitespace character in your paths. Spaces in IDF_PATH and project paths are allowed in version 5.0 or higher of IDF Tools. Your current IDF Tools version is ${version}`;
            Logger.warnNotify(versionMessage);
            isSkipped = true;
            return;
          }
          if (components && components.length > 0) {
            for (const component of components) {
              if (/\s/g.test(component.path)) {
                let versionMessage = `Detected a whitespace character in your paths. Spaces in IDF_PATH and project paths are allowed in version 5.0 or higher of IDF Tools. Your current IDF Tools version is ${version}`;
                Logger.warnNotify(versionMessage);
                isSkipped = true;
                return;
              }
            }
          }
          const projectDirExists = await utils.dirExistPromise(
            projectDirectory
          );
          if (!projectDirExists) {
            vscode.window.showInformationMessage(
              "Project directory doesn't exists."
            );
            this.panel.webview.postMessage({
              command: "goToBeginning",
            });
            isSkipped = true;
            return;
          }
          const projectNameExists = await utils.dirExistPromise(newProjectPath);
          if (projectNameExists) {
            const overwriteProject = await vscode.window.showInformationMessage(
              `${newProjectPath} already exists. Overwrite content?`,
              "Yes",
              "No"
            );
            if (
              typeof overwriteProject === "undefined" ||
              overwriteProject === "No"
            ) {
              isSkipped = true;
              return;
            }
          }
          await ensureDir(newProjectPath, { mode: 0o775 });
          if (template && template.path !== "") {
            await utils.copyFromSrcProject(template.path, newProjectPath);
          } else {
            const boilerplatePath = path.join(
              this.extensionPath,
              "templates",
              "boilerplate"
            );
            await utils.copyFromSrcProject(boilerplatePath, newProjectPath);
          }
          await utils.updateProjectNameInCMakeLists(
            newProjectPath,
            projectName
          );
          const settingsJsonPath = path.join(
            newProjectPath,
            ".vscode",
            "settings.json"
          );
          const settingsJson = await setCurrentSettingsInTemplate(
            settingsJsonPath,
            idfTarget,
            openOcdConfigs,
            port
          );
          await writeJSON(settingsJsonPath, settingsJson, {
            spaces:
              vscode.workspace.getConfiguration().get("editor.tabSize") || 2,
          });

          if (components && components.length > 0) {
            const componentsPath = path.join(newProjectPath, "components");
            await ensureDir(componentsPath, { mode: 0o775 });
            for (const comp of components) {
              const doesComponentExists = await utils.dirExistPromise(
                comp.path
              );
              if (doesComponentExists) {
                const compPath = path.join(componentsPath, comp.name);
                await ensureDir(compPath, { mode: 0o775 });
                await copy(comp.path, compPath);
              } else {
                const msg = `Component ${comp.name} path: ${comp.path} doesn't exist. Ignoring in new project...`;
                Logger.info(msg);
                OutputChannel.appendLine(msg);
              }
            }
          }
        } catch (error) {
          Logger.errorNotify(error.message, error);
        }
      }
    );
    if (isSkipped) {
      return;
    }
    const projectCreatedMsg = `Project ${projectName} has been created. Open project in a new window?`;
    const openProjectChoice = await vscode.window.showInformationMessage(
      projectCreatedMsg,
      "Yes",
      "No"
    );

    if (openProjectChoice && openProjectChoice === "Yes") {
      vscode.commands.executeCommand(
        "vscode.openFolder",
        vscode.Uri.file(newProjectPath),
        true
      );
    }
  }

  private async openFolder() {
    const selectedFolder = await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
    });
    if (selectedFolder && selectedFolder.length > 0) {
      return selectedFolder[0].fsPath;
    }
  }

  private async getTemplateDetail(projectPath: string) {
    try {
      const pathToUse = vscode.Uri.file(path.join(projectPath, "README.md"));
      const readMeContent = await readFile(pathToUse.fsPath);
      const contentStr = utils.markdownToWebviewHtml(
        readMeContent.toString(),
        projectPath,
        this.panel
      );
      this.panel.webview.postMessage({
        command: "setExampleDetail",
        templateDetail: contentStr,
      });
    } catch (error) {
      this.panel.webview.postMessage({
        command: "set_example_detail",
        templateDetail: "No README.md available for this project.",
      });
    }
  }

  private createHtml(scriptPath: vscode.Uri): string {
    return `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>ESP-IDF Project</title>
        </head>
        <body>
          <div id="app"></div>
        </body>
        <script src="${scriptPath}"></script>
      </html>`;
  }
}
