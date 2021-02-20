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

import { ensureDir, readFile, readJSON, writeJSON } from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import { LocDictionary } from "../localizationDictionary";
import { Logger } from "../logger/logger";
import * as utils from "../utils";
import { createExamplesHtml } from "./createExamplesHtml";
import marked from "marked";
import { ESP } from "../config";

const locDic = new LocDictionary("ExamplesPanel");

export class ExamplesPlanel {
  public static currentPanel: ExamplesPlanel | undefined;

  public static createOrShow(
    extensionPath: string,
    targetFrameworkFolder: string,
    targetDesc: string
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : vscode.ViewColumn.One;
    if (ExamplesPlanel.currentPanel) {
      ExamplesPlanel.currentPanel.panel.reveal(column);
    } else {
      ExamplesPlanel.currentPanel = new ExamplesPlanel(
        extensionPath,
        column,
        targetFrameworkFolder,
        targetDesc
      );
    }
  }

  private static readonly viewType = "examples";
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  private constructor(
    extensionPath: string,
    column: vscode.ViewColumn,
    targetFrameworkFolder: string,
    targetDesc: string
  ) {
    const panelTitle = locDic.localize(
      "examples.panelName",
      `${targetDesc} Examples`
    );
    this.panel = vscode.window.createWebviewPanel(
      ExamplesPlanel.viewType,
      panelTitle,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(extensionPath, "dist", "views")),
          vscode.Uri.file(targetFrameworkFolder),
        ],
      }
    );
    const scriptPath = this.panel.webview.asWebviewUri(
      vscode.Uri.file(
        path.join(extensionPath, "dist", "views", "examples-bundle.js")
      )
    );
    this.panel.iconPath = utils.getWebViewFavicon(extensionPath);
    this.panel.webview.html = createExamplesHtml(scriptPath);

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "openExampleProject":
          if (message.project_path && message.name) {
            const selectedFolder = await vscode.window.showOpenDialog({
              canSelectFolders: true,
              canSelectFiles: false,
              canSelectMany: false,
            });
            if (!selectedFolder) {
              return;
            }
            try {
              const resultFolder = path.join(
                selectedFolder[0].fsPath,
                message.name
              );
              await ensureDir(resultFolder);
              await utils.copyFromSrcProject(
                message.project_path,
                resultFolder
              );
              const settingsJsonPath = path.join(
                resultFolder,
                ".vscode",
                "settings.json"
              );
              const settingsJson = await readJSON(settingsJsonPath);
              const modifiedEnv = utils.appendIdfAndToolsToPath();
              const idfTarget = modifiedEnv.IDF_TARGET || "esp32";
              const compilerPath = await utils.isBinInPath(
                `xtensa-${idfTarget}-elf-gcc`,
                resultFolder,
                modifiedEnv
              );
              settingsJson["C_Cpp.default.compilerPath"] = compilerPath;
              await writeJSON(settingsJsonPath, settingsJson, {
                spaces:
                  vscode.workspace.getConfiguration().get("editor.tabSize") ||
                  2,
              });
              const projectPath = vscode.Uri.file(resultFolder);
              vscode.commands.executeCommand("vscode.openFolder", projectPath);
            } catch (error) {
              const msg = `Error copying ESP-IDF example.`;
              Logger.error(msg, error);
              const opt = await vscode.window.showErrorMessage(
                msg,
                "Show Docs",
                "Ok"
              );
              if (opt === "Show Docs") {
                vscode.env.openExternal(vscode.Uri.parse(ESP.URL.Docs.README));
              }
            }
          }
          break;
        case "getExamplesList":
          this.obtainExamplesList(targetFrameworkFolder);
          break;
        case "getExampleDetail":
          if (message.path) {
            const pathToUse = vscode.Uri.file(
              path.join(message.path, "README.md")
            );
            try {
              const content = await readFile(pathToUse.fsPath);
              const contentStr = this.resolveImgPath(
                content.toString(),
                message.path
              );
              this.panel.webview.postMessage({
                command: "set_example_detail",
                example_detail: contentStr,
              });
            } catch (err) {
              const notAvailable = "No README.md available for this project.";
              Logger.info(notAvailable);
              Logger.info(err);
              this.panel.webview.postMessage({
                command: "set_example_detail",
                example_detail: notAvailable,
              });
              vscode.window.showInformationMessage(notAvailable);
            }
          }
          break;
        default:
          return;
      }
    });
  }

  public dispose() {
    ExamplesPlanel.currentPanel = undefined;
    this.panel.dispose();
  }

  private resolveImgPath(content: string, examplePath: string) {
    marked.setOptions({
      baseUrl: null,
      breaks: true,
      gfm: true,
      pedantic: false,
      renderer: new marked.Renderer(),
      sanitize: true,
      smartLists: true,
      smartypants: false,
    });
    let contentStr = marked(content);
    const srcLinkRegex = new RegExp(/src\s*=\s*"(.+?)"/g);
    let match: RegExpExecArray;
    while ((match = srcLinkRegex.exec(contentStr)) !== null) {
      const unresolvedPath = match[1];
      const absPath = `src="${this.panel.webview.asWebviewUri(
        vscode.Uri.file(path.resolve(examplePath, unresolvedPath))
      )}"`;
      contentStr = contentStr.replace(match[0], absPath);
    }
    const srcEncodedRegex = new RegExp(/&lt;img src=&quot;(.*?)&quot;\s?&gt;/g);
    let encodedMatch: RegExpExecArray;
    while ((encodedMatch = srcEncodedRegex.exec(contentStr)) !== null) {
      const pathToResolve = encodedMatch[0].match(
        /(?:src=&quot;)(.*?)(?:&quot;)/
      );
      const height = encodedMatch[0].match(/(?:height=&quot;)(.*?)(?:&quot;)/);
      const width = encodedMatch[0].match(/(?:width=&quot;)(.*?)(?:&quot;)/);
      const altText = encodedMatch[0].match(/(?:alt=&quot;)(.*?)(?:&quot;)/);
      const absPath = `<img src="${this.panel.webview.asWebviewUri(
        vscode.Uri.file(path.resolve(examplePath, pathToResolve[1]))
      )}" ${height && height.length > 0 ? `height="${height[1]}"` : ""} ${
        width && width.length > 0 ? `width="${width[1]}"` : ""
      } ${altText && altText.length > 0 ? `alt="${altText[1]}"` : ""} >`;
      contentStr = contentStr.replace(encodedMatch[0], absPath);
    }
    contentStr = contentStr.replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    return contentStr;
  }

  private async obtainExamplesList(targetFrameworkFolder: string) {
    const examplesPath = path.join(targetFrameworkFolder, "examples");
    const examplesCategories = utils.getDirectories(examplesPath);
    const examplesListPaths = utils.getSubProjects(examplesPath);
    const exampleListInfo = examplesListPaths.map((examplePath) => {
      const exampleCategory = examplesCategories.find(
        (exampleCat) => examplePath.indexOf(exampleCat) > -1
      );
      const regexToUse =
        process.platform === "win32" ? /([^\\]*)\\*$/ : /([^\/]*)\/*$/;
      const exampleName = examplePath.match(regexToUse)[1];
      return {
        category: exampleCategory,
        name: exampleName,
        path: examplePath,
      };
    });
    this.panel.webview.postMessage({
      command: "set_examples_path",
      example_list: exampleListInfo,
    });

    this.panel.webview.postMessage({
      command: "set_initial_example",
      selected_example: exampleListInfo[0],
    });
  }
}
