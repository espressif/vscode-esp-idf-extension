/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 6th July 2022 9:51:19 pm
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

import { TreeItem, TreeItemCollapsibleState } from "vscode";
import { AddrRange, NodeSetting, NumberFormat } from "./common";
import { PeripheralBaseNode } from "./nodes/base";
import { AccessType, EspIdfPeripheralTreeItem } from "./peripheral";
import { EspIdfPeripheralRegisterTreeItem } from "./register";
import { hexFormat } from "./utils";

export interface ClusterOptions {
  name: string;
  description?: string;
  addressOffset: number;
  accessType?: AccessType;
  size?: number;
  resetValue?: number;
}

export class EspIdfPeripheralClusterTreeItem extends PeripheralBaseNode {
  private children: EspIdfPeripheralRegisterTreeItem[];
  public readonly name: string;
  public readonly description?: string;
  public readonly offset: number;
  public readonly size: number;
  public readonly resetValue: number;
  public readonly accessType: AccessType;

  constructor(
    public parent: EspIdfPeripheralTreeItem,
    options: ClusterOptions
  ) {
    super(parent);
    this.name = options.name;
    this.description = options.description;
    this.offset = options.addressOffset;
    this.accessType = options.accessType || AccessType.ReadWrite;
    this.size = options.size || parent.size;
    this.resetValue = options.resetValue || parent.resetValue;
    this.children = [];
    this.parent.addChild(this);
  }

  public getTreeItem(): TreeItem | Promise<TreeItem> {
    const label = `${this.name} [${hexFormat(this.offset, 0)}]`;

    const item = new TreeItem(
      label,
      this.expanded
        ? TreeItemCollapsibleState.Expanded
        : TreeItemCollapsibleState.Collapsed
    );
    item.contextValue = "cluster";
    item.tooltip = this.description || undefined;

    return item;
  }

  public getChildren(): EspIdfPeripheralRegisterTreeItem[] {
    return this.children;
  }

  public setChildren(children: EspIdfPeripheralRegisterTreeItem[]) {
    this.children = children.slice(0, children.length);
    this.children.sort((r1, r2) => (r1.offset > r2.offset ? 1 : -1));
  }

  public addChild(child: EspIdfPeripheralRegisterTreeItem) {
    this.children.push(child);
    this.children.sort((r1, r2) => (r1.offset > r2.offset ? 1 : -1));
  }

  public getBytes(offset: number, size: number): Uint8Array {
    return this.parent.getBytes(this.offset + offset, size);
  }

  public getAddress(offset: number) {
    return this.parent.getAddress(this.offset + offset);
  }

  public getOffset(offset: number) {
    return this.parent.getOffset(this.offset + offset);
  }

  public getFormat(): NumberFormat {
    if (this.format !== NumberFormat.Auto) {
      return this.format;
    } else {
      return this.parent.getFormat();
    }
  }

  public updateData(): Thenable<any> {
    return new Promise((resolve, reject) => {
      const promises = this.children.map((r) => r.updateData());
      Promise.all(promises)
        .then((updated) => {
          resolve(true);
        })
        .catch((e) => {
          reject("Failed");
        });
    });
  }

  public saveState(path: string): NodeSetting[] {
    const results: NodeSetting[] = [];

    if (this.format !== NumberFormat.Auto || this.expanded) {
      results.push({
        node: `${path}.${this.name}`,
        expanded: this.expanded,
        format: this.format,
      });
    }

    this.children.forEach((c) => {
      results.push(...c.saveState(`${path}.${this.name}`));
    });

    return results;
  }

  public findByPath(path: string[]): PeripheralBaseNode {
    if (path.length === 0) {
      return this;
    } else {
      const child = this.children.find((c) => c.name === path[0]);
      if (child) {
        return child.findByPath(path.slice(1));
      } else {
        return null;
      }
    }
  }

  public collectRanges(ary: AddrRange[]): void {
    this.children.map((r) => {
      r.collectRanges(ary);
    });
  }

  public getPeripheral(): PeripheralBaseNode {
    return this.parent.getPeripheral();
  }

  public getCopyValue(): string {
    throw new Error("Method not implemented.");
  }

  public performUpdate(): Thenable<any> {
    throw new Error("Method not implemented.");
  }
}
