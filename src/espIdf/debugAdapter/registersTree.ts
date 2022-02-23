/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 23rd February 2022 3:48:04 pm
 * Copyright 2022 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { EventEmitter, TreeDataProvider, TreeItem, window } from "vscode";
import { Disposable } from "vscode-languageclient";

class ESPRegisterTreeDataItem extends TreeItem {
  constructor(label: string) {
    super(label);
  }

  public set commandId(cmd: string) {
    this.command = {
      command: cmd,
      title: this.label as string,
    };
  }
}

export class ESPRegisterTreeDataProvider
  implements TreeDataProvider<ESPRegisterTreeDataItem> {
  private espRegisterTreeData: ESPRegisterTreeDataItem[];
  private _onDidChangeTreeData = new EventEmitter<ESPRegisterTreeDataItem>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  getTreeItem(e: ESPRegisterTreeDataItem) {
    return e;
  }

  async getChildren(
    e?: ESPRegisterTreeDataItem
  ): Promise<ESPRegisterTreeDataItem[]> {
    return this.espRegisterTreeData;
  }

  load(data: any) {
    if (!data.result) {
      return;
    }
    this.espRegisterTreeData = [];
    const registersLine = data.result.trim().split("\n");
    for (const line of registersLine) {
      let parts = line.replace(/\s+/, " ").split(" ");
      console.log(parts);
      let newItem = new ESPRegisterTreeDataItem(`${parts[0]} = ${parts[1]}`);
      newItem.tooltip = parts[1];
      this.espRegisterTreeData.push(newItem);
    }
    this.refresh();
  }

  refresh() {
    this._onDidChangeTreeData.fire(null);
  }

  public clearResults() {
    this.espRegisterTreeData = undefined;
    this.refresh();
  }

  public registerTreeDataProvider(treeName: string): Disposable {
    return window.registerTreeDataProvider(treeName, this);
  }
}
