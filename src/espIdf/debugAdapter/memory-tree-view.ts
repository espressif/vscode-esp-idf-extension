/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 24th November 2020 2:51:43 pm
 * Copyright 2020 Espressif Systems (Shanghai) CO LTD
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

import {
  Event,
  EventEmitter,
  ThemeIcon,
  TreeDataProvider,
  TreeItem,
} from "vscode";

export class ESPDAMemoryTreeItem extends TreeItem {
  constructor(register: string, value: string) {
    super(`${register} = ${value}`);
    this.iconPath = new ThemeIcon("symbol-variable");
  }
}

export class ESPDAMemoryTreeDataProvider
  implements TreeDataProvider<ESPDAMemoryTreeItem> {
  private _onDidChangeTreeData: EventEmitter<
    ESPDAMemoryTreeItem
  > = new EventEmitter<ESPDAMemoryTreeItem>();
  readonly onDidChangeTreeData: Event<ESPDAMemoryTreeItem> = this
    ._onDidChangeTreeData.event;

  constructor(private memoryItems: ESPDAMemoryTreeItem[]) {}

  refresh(items?: ESPDAMemoryTreeItem[]) {
    if (items) {
      this.memoryItems = items;
    }
    this._onDidChangeTreeData.fire(null);
  }

  getTreeItem(element: ESPDAMemoryTreeItem): TreeItem {
    return element;
  }
  getChildren(_?: ESPDAMemoryTreeItem): ESPDAMemoryTreeItem[] {
    return this.memoryItems;
  }
}
