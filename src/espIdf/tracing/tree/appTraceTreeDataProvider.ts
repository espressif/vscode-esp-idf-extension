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

export enum AppTraceButtonType {
  AppTraceButton = 0,
  HeapTraceButton = 1,
}

// tslint:disable-next-line: max-classes-per-file
export class AppTraceTreeDataProvider
  implements vscode.TreeDataProvider<AppTracerItems> {
  public OnDidChangeTreeData: vscode.EventEmitter<
    AppTracerItems
  > = new vscode.EventEmitter<AppTracerItems>();
  public readonly onDidChangeTreeData: vscode.Event<AppTracerItems> = this
    .OnDidChangeTreeData.event;
  public appTraceButton: AppTracerItems;
  public heapTraceButton: AppTracerItems;

  constructor() {
    this.initAppTraceButton();
    this.initHeapTraceButton();
  }
  public registerDataProviderForTree(treeName: string): vscode.Disposable {
    return vscode.window.registerTreeDataProvider(treeName, this);
  }

  public showStartButton(buttonType: AppTraceButtonType) {
    const button: AppTracerItems = this.getButtonInstance(buttonType);
    button.label = this.getLabelForButton(buttonType, "Start");
    button.iconPath = {
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
    button.description = "";
    this.refresh();
  }
  public showStopButton(buttonType: AppTraceButtonType) {
    const button: AppTracerItems = this.getButtonInstance(buttonType);
    button.label = this.getLabelForButton(buttonType, "Stop");
    button.iconPath = {
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
  public updateDescription(buttonType: AppTraceButtonType, desc: string) {
    const button: AppTracerItems = this.getButtonInstance(buttonType);
    button.description = desc;
    this.refresh();
  }

  public getTreeItem(element: AppTracerItems): vscode.TreeItem {
    return element;
  }
  public getChildren(element?: AppTracerItems): AppTracerItems[] {
    return [this.appTraceButton, this.heapTraceButton];
  }
  public refresh() {
    this.OnDidChangeTreeData.fire();
  }
  private initAppTraceButton() {
    this.appTraceButton = new AppTracerItems("Start App Trace");
    this.appTraceButton.description = "";
    this.appTraceButton.iconPath = {
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
    this.appTraceButton.command = { command: "espIdf.apptrace", title: "" };
  }
  private initHeapTraceButton() {
    this.heapTraceButton = new AppTracerItems("Start Heap Trace");
    this.heapTraceButton.description = "";
    this.heapTraceButton.iconPath = {
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
    this.heapTraceButton.command = { command: "espIdf.heaptrace", title: "" };
  }
  private getButtonInstance(buttonType: AppTraceButtonType): AppTracerItems {
    let btn: AppTracerItems;
    switch (buttonType) {
      case AppTraceButtonType.AppTraceButton:
        btn = this.appTraceButton;
        break;
      case AppTraceButtonType.HeapTraceButton:
        btn = this.heapTraceButton;
        break;
      default:
        break;
    }
    return btn;
  }
  private getLabelForButton(
    buttonType: AppTraceButtonType,
    prefix?: string
  ): string {
    let buttonLabel = prefix || "";
    switch (buttonType) {
      case AppTraceButtonType.AppTraceButton:
        buttonLabel += " App Trace";
        break;
      case AppTraceButtonType.HeapTraceButton:
        buttonLabel += " Heap Trace";
      default:
        break;
    }
    return buttonLabel;
  }
}
