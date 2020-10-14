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
import { LocDictionary } from "../../localizationDictionary";
import { Logger } from "../../logger/logger";
import { ConfserverProcess } from "./confServerProcess";
import { Menu } from "./Menu";

const locDic = new LocDictionary(__filename);

export class MenuConfigPanel {
  public static currentPanel: MenuConfigPanel | undefined;

  public static createOrShow(
    extensionPath: string,
    curWorkspaceFolder: vscode.Uri,
    initialValues: Menu[]
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;
    if (MenuConfigPanel.currentPanel) {
      MenuConfigPanel.currentPanel.panel.reveal(column);
    } else {
      MenuConfigPanel.currentPanel = new MenuConfigPanel(
        extensionPath,
        column || vscode.ViewColumn.One,
        curWorkspaceFolder,
        initialValues
      );
    }
  }

  private static readonly viewType = "menuconfig";
  private readonly curWorkspaceFolder: vscode.Uri;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  private constructor(
    extensionPath: string,
    column: vscode.ViewColumn,
    curWorkspaceFolder: vscode.Uri,
    initialValues: Menu[]
  ) {
    this.curWorkspaceFolder = curWorkspaceFolder;

    const menuconfigPanelTitle = locDic.localize(
      "menuconfig.panelName",
      "SDK Configuration editor"
    );
    this.panel = vscode.window.createWebviewPanel(
      MenuConfigPanel.viewType,
      menuconfigPanelTitle,
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
        path.join(extensionPath, "dist", "views", "menuconfig-bundle.js")
      )
    );
    this.panel.iconPath = vscode.Uri.file(
      path.join(extensionPath, "media", "espressif_icon.png")
    );
    this.panel.webview.html = this.createMenuconfigHtml(scriptPath);

    ConfserverProcess.registerListener(this.updateConfigValues);

    const menuconfigViewDict = new LocDictionary("menuconfig", "views");
    this.panel.webview.postMessage({
      command: "load_dictionary",
      text_dictionary: menuconfigViewDict.getDictionary(),
    });

    this.panel.onDidDispose(
      () => {
        if (!ConfserverProcess.areValuesSaved()) {
          const changesNotSavedMessage = locDic.localize(
            "menuconfig.changesNotSaved",
            "Changes in SDK Configuration editor have not been saved. Would you like to save them?"
          );
          const saveMsg = locDic.localize("menuconfig.save", "Save");
          const discardMsg = locDic.localize(
            "menuconfig.discard",
            "Don't save"
          );
          const returnToGuiconfigMsg = locDic.localize(
            "menuconfig.returnGuiconfig",
            "Return to SDK Configuration editor"
          );
          const isModal = process.platform !== "win32" ? true : false;
          vscode.window
            .showInformationMessage(
              changesNotSavedMessage,
              { modal: isModal },
              { title: saveMsg, isCloseAffordance: false },
              { title: returnToGuiconfigMsg, isCloseAffordance: false },
              { title: discardMsg, isCloseAffordance: true }
            )
            .then((selected) => {
              if (selected.title === saveMsg) {
                ConfserverProcess.saveGuiConfigValues();
              } else if (selected.title === returnToGuiconfigMsg) {
                this.dispose();
                vscode.commands.executeCommand("menuconfig.start");
                return;
              } else {
                ConfserverProcess.loadGuiConfigValues(true);
              }
            });
        }
        this.dispose();
      },
      null,
      this.disposables
    );

    this.panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "updateValue":
          ConfserverProcess.setUpdatedValue(message.updated_value as Menu);
          break;
        case "setDefault":
          const changesNotSavedMessage = locDic.localize(
            "menuconfig.confirmSetDefault",
            "This action will delete your project sdkconfig. Continue?"
          );
          const yesMsg = locDic.localize("menuconfig.save", "Yes");
          const noMsg = locDic.localize("menuconfig.discard", "No");
          const isModal = process.platform !== "win32" ? true : false;
          const selected = await vscode.window.showInformationMessage(
            changesNotSavedMessage,
            { modal: isModal },
            { title: yesMsg, isCloseAffordance: false },
            { title: noMsg, isCloseAffordance: true }
          );
          if (selected.title === yesMsg) {
            vscode.window.withProgress(
              {
                cancellable: true,
                location: vscode.ProgressLocation.Notification,
                title: "ESP-IDF: Menuconfig",
              },
              async (
                progress: vscode.Progress<{
                  message: string;
                  increment: number;
                }>
              ) => {
                try {
                  await ConfserverProcess.setDefaultValues(progress);
                } catch (error) {
                  Logger.errorNotify(error.message, error);
                }
              }
            );
          }
          break;
        case "saveChanges":
          ConfserverProcess.saveGuiConfigValues();
          const saveMessage = locDic.localize(
            "menuconfig.saveValues",
            "Saved changes in SDK Configuration editor"
          );
          Logger.infoNotify(saveMessage);
          break;
        case "discardChanges":
          ConfserverProcess.loadGuiConfigValues();
          const discardMessage = locDic.localize(
            "menuconfig.discardValues",
            "Discarded changes in SDK Configuration editor"
          );
          Logger.infoNotify(discardMessage);
          break;
        case "requestInitValues":
          MenuConfigPanel.currentPanel.panel.webview.postMessage({
            command: "load_initial_values",
            menus: initialValues,
          });
          break;
        default:
          const err = new Error(
            `Menuconfig: Unrecognized command received, file: ${__filename}`
          );
          Logger.error(err.message, err);
          break;
      }
    });
  }

  public dispose() {
    MenuConfigPanel.currentPanel = undefined;
    this.panel.dispose();
  }

  private updateConfigValues(values: string) {
    // This function will be executed when confServerProcess
    // receives a new JSON with values.
    const jsonValues = JSON.parse(values);
    if (Object.keys(jsonValues.values).length <= 0) {
      return;
    }

    if (jsonValues.error) {
      const err = new Error(`Invalid data error: ${jsonValues.error}`);
      Logger.error(err.message, err);
      return;
    }
    const updatedMenus = ConfserverProcess.updateValues(values);
    MenuConfigPanel.currentPanel.panel.webview.postMessage({
      command: "update_values",
      updated_values: updatedMenus,
    });
  }

  private createMenuconfigHtml(scriptPath: vscode.Uri): string {
    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Menuconfig</title>
            </head>
            <body>
                <div id="menuconfig"></div>
            </body>
            <script src="${scriptPath}"></script>
        </html>`;
  }
}
