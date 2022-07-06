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
import { EspIdfPeripheralClusterTreeItem } from "./cluster";
import { AddrRange, NodeSetting, NumberFormat } from "./common";
import { PeripheralBaseNode } from "./nodes/base";
import { EspIdfPeripheralRegisterTreeItem } from "./register";
import { hexFormat, readMemoryChunks, splitIntoChunks } from "./utils";

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
  private children: Array<
    EspIdfPeripheralRegisterTreeItem | EspIdfPeripheralClusterTreeItem
  >;
  public readonly name: string;
  public readonly baseAddress: number;
  public readonly description: string;
  public readonly groupName: string;
  public readonly totalLength: number;
  public readonly accessType: AccessType;
  public readonly size: number;
  public readonly resetValue: number;
  protected addrRanges: AddrRange[];

  private currentValue: number[];

  constructor(
    public session: DebugSession,
    public gapThreshold,
    options: PeripheralOptions
  ) {
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

  public getBytes(offset: number, size: number): Uint8Array {
    try {
      return new Uint8Array(this.currentValue.slice(offset, offset + size));
    } catch (e) {
      return new Uint8Array(0);
    }
  }

  public getAddress(offset: number) {
    return this.baseAddress + offset;
  }

  public getOffset(offset: number) {
    return offset;
  }

  public getFormat(): NumberFormat {
    return this.format;
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
          this.updateChildData(null, reject, new Error(str));
        });
    });
  }

  private updateChildData(resolve, reject, err: Error) {
    if (err) {
      return reject(err);
    }
    const promises = this.children.map((r) => r.updateData());
    Promise.all(promises)
      .then((result) => {
        return resolve(true);
      })
      .catch((err) => {
        const msg = err.message || "unknown error";
        const str = `Failed to update peripheral ${this.name}: ${msg}`;
        if (debug.activeDebugConsole) {
          debug.activeDebugConsole.appendLine(str);
        }
        return reject(err ? err : new Error(str));
      });
  }

  private readMemory(): Promise<boolean> {
    if (!this.currentValue) {
      this.currentValue = new Array<number>(this.totalLength);
    }
    return readMemoryChunks(
      this.session,
      this.baseAddress,
      this.addrRanges,
      this.currentValue
    );
  }

  public collectRanges(): void {
    const addresses: AddrRange[] = [];
    this.children.map((child) => child.collectRanges(addresses));
    addresses.sort((a, b) => (a.base < b.base ? -1 : a.base > b.base ? 1 : 0));
    addresses.map((reg) => (reg.base += this.baseAddress));

    let ranges: AddrRange[] = [];
    if (this.gapThreshold >= 0) {
      let last: AddrRange = null;
      for (const r of addresses) {
        if (last && last.nxtAddr() + this.gapThreshold) {
          const max = Math.max(last.nxtAddr(), r.nxtAddr());
          last.length = max - last.base;
        } else {
          ranges.push(r);
          last = r;
        }
      }
    } else {
      ranges = addresses;
    }

    const maxBytes = 4 * 1024;
    this.addrRanges = splitIntoChunks(
      ranges,
      maxBytes,
      this.name,
      this.totalLength
    );
  }

  public getPeripheralNode() {
    return this;
  }

  public selected(): Thenable<boolean> {
    return this.performUpdate();
  }

  public saveState(path?: string): NodeSetting[] {
    const results: NodeSetting[] = [];

    if (this.format === NumberFormat.Auto || this.expanded || this.pinned) {
      results.push({
        node: `${this.name}`,
        expanded: this.expanded,
        format: this.format,
        pinned: this.pinned,
      });
    }

    this.children.forEach((c) => {
      results.push(...c.saveState(`${this.name}`));
    });

    return results;
  }

  public static compare(
    p1: EspIdfPeripheralTreeItem,
    p2: EspIdfPeripheralTreeItem
  ): number {
    if ((p1.pinned && p2.pinned) || (!p1.pinned && !p2.pinned)) {
      if (p1.groupName !== p2.groupName) {
        return p1.groupName > p2.groupName ? 1 : -1;
      } else if (p1.name !== p2.name) {
        return p1.name > p2.name ? 1 : -1;
      } else {
        return 0;
      }
    } else {
      return p1.pinned ? -1 : 1;
    }
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

  public performUpdate(): Thenable<any> {
    throw new Error("Method not implemented.");
  }

  public getCopyValue(): string {
    throw new Error("Method not implemented.");
  }
}
