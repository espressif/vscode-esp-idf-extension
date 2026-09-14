/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 23rd April 2025 5:52:06 pm
 * Copyright 2025 Espressif Systems (Shanghai) CO LTD
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

import {
  Command,
  Event,
  EventEmitter,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
} from "vscode";

export interface HexElement {
  name: string;
  value: number;
}

export class HexTreeItem extends TreeItem {
  constructor(
    public readonly element: HexElement,
    public readonly command?: Command
  ) {
    super(element.name, TreeItemCollapsibleState.None);
    const hexValue = `0x${(element.value >>> 0)
      .toString(16)
      .padStart(8, "0")
      .toUpperCase()}`;
    const binaryValue = `0b${(element.value >>> 0)
      .toString(2)
      .padStart(8, "0")}`;
    this.description = `${element.value} Hex: ${hexValue} Binary: ${binaryValue}`;

    this.contextValue = "debugHexItem";
  }
}

export class HexViewProvider implements TreeDataProvider<HexTreeItem> {
  private _onDidChangeTreeData: EventEmitter<
    HexTreeItem | undefined | void
  > = new EventEmitter<HexTreeItem | undefined | void>();
  readonly onDidChangeTreeData: Event<HexTreeItem | undefined | void> = this
    ._onDidChangeTreeData.event;

  private elements: HexElement[] = [];

  getTreeItem(element: HexTreeItem): TreeItem {
    return element;
  }

  getChildren(): Thenable<HexTreeItem[]> {
    return Promise.resolve(this.elements.map((e) => new HexTreeItem(e)));
  }

  addElement(name: string, value: number): void {
    this.elements.push({ name, value });
    this._onDidChangeTreeData.fire();
  }

  removeElement(element: HexElement): void {
    this.elements = this.elements.filter((e) => e !== element);
    this._onDidChangeTreeData.fire();
  }

  findElement(name: string): HexElement | undefined {
    return this.elements.find((e) => e.name === name);
  }

  updateElement(name: string, value: number): void {
    const element = this.findElement(name);
    if (element) {
      element.value = value;
      this._onDidChangeTreeData.fire();
    }
  }
}
