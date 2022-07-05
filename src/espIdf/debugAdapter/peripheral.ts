/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 4th July 2022 5:38:42 pm
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

import {
  debug,
  DebugSession,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
} from "vscode";
import { PeripheralBaseNode } from "./nodes/base";
import {
  EspIdfPeripheralClusterTreeItem,
  EspIdfPeripheralRegisterTreeItem,
} from "./register";

export enum AccessType {
  ReadOnly = 1,
  ReadWrite,
  WriteOnly,
}

export const AccessTypeMap = {
  "read-only": AccessType.ReadOnly,
  "write-only": AccessType.WriteOnly,
  "read-write": AccessType.ReadWrite,
  writeOnce: AccessType.WriteOnly,
  "read-writeOnce": AccessType.ReadWrite,
};

export interface PeripheralOptions {
  name: string;
  baseAddress: number;
  totalLength: number;
  description: string;
  groupName?: string;
  accessType?: AccessType;
  size?: number;
  resetValue?: number;
}

export class EspIdfPeripheralTreeItem extends PeripheralBaseNode {
  private children:
    | EspIdfPeripheralRegisterTreeItem[]
    | EspIdfPeripheralClusterTreeItem[];
  public readonly name: string;
  public readonly baseAddress: number;
  public readonly description: string;
  public readonly groupName: string;
  public readonly totalLength: number;
  public readonly accessType: AccessType;
  public readonly size: number;
  public readonly resetValue: number;
  protected addrRanges: AddrRange[];

  constructor(public session: DebugSession, options: PeripheralOptions) {
    super(null);
    this.iconPath = new ThemeIcon("symbol-variable");
    this.name = options.name;
    this.baseAddress = options.baseAddress;
    this.totalLength = options.totalLength;
    this.description = options.description;
    this.groupName = options.groupName || "";
    this.resetValue = options.resetValue || 0;
    this.size = options.size || 32;
    this.children = [];
    this.addrRanges = [];
  }

  public getPeripheral(): PeripheralBaseNode {
    return this;
  }

  public getTreeItem(): TreeItem | Promise<TreeItem> {
    const label = `${this.name} @ ${hexFormat(this.baseAddress)}`;
    const item = new TreeItem(
      label,
      this.expanded
        ? TreeItemCollapsibleState.Expanded
        : TreeItemCollapsibleState.Collapsed
    );
    item.contextValue = this.pinned ? "peripheral.pinned" : "peripheral";
    item.tooltip = this.description || undefined;
    if (this.pinned) {
      item.iconPath = new ThemeIcon("pinned");
    }
    return item;
  }

  public getChildren(): PeripheralBaseNode[] | Promise<PeripheralBaseNode[]> {
    return this.children;
  }

  public setChildren(
    children: Array<
      EspIdfPeripheralRegisterTreeItem | EspIdfPeripheralClusterTreeItem
    >
  ) {
    this.children = children;
    this.children.sort((child1, child2) =>
      child1.offset > child2.offset ? 1 : -1
    );
  }

  public addChild(
    child: EspIdfPeripheralRegisterTreeItem | EspIdfPeripheralClusterTreeItem
  ) {
    this.children.push(child);
    this.children.sort((child1, child2) =>
      child1.offset > child2.offset ? 1 : -1
    );
  }

  public getAddress(offset: number) {
    return this.baseAddress + offset;
  }

  public getOffset(offset: number) {
    return offset;
  }

  public updateData(): Thenable<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.expanded) {
        return resolve(false);
      }

      this.readMemory()
        .then((unused) => {
          this.updateChildData(resolve, reject, null);
        })
        .catch((error) => {
          const msg = error.message || "unknown error";
          const str = `Failed to update peripheral ${this.name}: ${msg}`;
          if (debug.activeDebugConsole) {
            debug.activeDebugConsole.appendLine(str);
          }
          this.updateChildData(null, reject);
        });
    });
  }

  private updateChildData(resolve, reject, err: Error) {
    if (err) {
      return reject(err);
    }
    const promises = this.children.map((r) => r.updateData());
    Promise.all(promises).then((result) => {
       return resolve(true);
    }).catch((err) => {
      const msg = err.message || "unknown error";
      const str = `Failed to update peripheral ${this.name}: ${msg}`;
      if (debug.activeDebugConsole) {
        debug.activeDebugConsole.appendLine(str);
      }
      return reject(err ? err : new Error(str));
    });
  }
}
