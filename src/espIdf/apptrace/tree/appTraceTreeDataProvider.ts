/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 12th July 2019 9:20:01 am
 * Copyright 2019 Espressif Systems (Shanghai) CO LTD
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { join } from "path";
import * as vscode from "vscode";

class AppTracerItems extends vscode.TreeItem {}

// tslint:disable-next-line: max-classes-per-file
export class AppTraceTreeDataProvider
  implements vscode.TreeDataProvider<AppTracerItems> {
  public OnDidChangeTreeData: vscode.EventEmitter<
    AppTracerItems
  > = new vscode.EventEmitter<AppTracerItems>();
  public readonly onDidChangeTreeData: vscode.Event<AppTracerItems> = this
    .OnDidChangeTreeData.event;
  public appTraceStartButton: AppTracerItems;

  constructor() {
    this.initStartAppTraceButton();
  }
  public initStartAppTraceButton() {
    this.appTraceStartButton = new AppTracerItems("Start App Trace");
    this.appTraceStartButton.description = "";
    this.appTraceStartButton.iconPath = {
      dark: join(
        __filename,
        "..",
        "..",
        "..",
        "..",
        "..",
        "media",
        "play_dark.svg"
      ),
      light: join(
        __filename,
        "..",
        "..",
        "..",
        "..",
        "..",
        "media",
        "play_light.svg"
      ),
    };
    this.appTraceStartButton.command = {
      command: "espIdf.apptrace",
      title: "",
    };
  }
  public registerDataProviderForTree(treeName: string): vscode.Disposable {
    return vscode.window.registerTreeDataProvider(treeName, this);
  }

  public showStartButton() {
    this.appTraceStartButton.label = "Start App Trace";
    this.appTraceStartButton.iconPath = {
      dark: join(
        __filename,
        "..",
        "..",
        "..",
        "..",
        "..",
        "media",
        "play_dark.svg"
      ),
      light: join(
        __filename,
        "..",
        "..",
        "..",
        "..",
        "..",
        "media",
        "play_light.svg"
      ),
    };
    this.appTraceStartButton.description = "";
    this.refresh();
  }
  public showStopButton() {
    this.appTraceStartButton.label = "Stop App Trace";
    this.appTraceStartButton.iconPath = {
      dark: join(
        __filename,
        "..",
        "..",
        "..",
        "..",
        "..",
        "media",
        "stop_dark.svg"
      ),
      light: join(
        __filename,
        "..",
        "..",
        "..",
        "..",
        "..",
        "media",
        "stop_light.svg"
      ),
    };
    this.refresh();
  }
  public updateDescription(desc: string) {
    this.appTraceStartButton.description = desc;
    this.refresh();
  }

  public getTreeItem(element: AppTracerItems): vscode.TreeItem {
    return element;
  }
  public getChildren(element?: AppTracerItems): AppTracerItems[] {
    return [this.appTraceStartButton];
  }
  public refresh() {
    this.OnDidChangeTreeData.fire(null);
  }
}
