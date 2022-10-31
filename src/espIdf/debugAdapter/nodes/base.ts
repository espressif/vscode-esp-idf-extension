/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 5th July 2022 3:40:09 pm
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
  Command,
  DebugSession,
  TreeItem,
  TreeItemCollapsibleState,
} from "vscode";
import { AddrRange, NodeSetting, NumberFormat } from "../common";

export abstract class BasePeripheral extends TreeItem {
  public expanded: boolean;

  constructor(protected readonly parent?: BasePeripheral) {
    super("PeripheralNode", TreeItemCollapsibleState.Collapsed);
    this.expanded = false;
  }

  public getParent(): BasePeripheral | undefined {
    return this.parent;
  }

  public abstract getChildren(): BasePeripheral[] | Promise<BasePeripheral[]>;
  public abstract getTreeItem(): TreeItem | Promise<TreeItem>;

  public getCommand(): Command | undefined {
    return undefined;
  }

  public abstract getCopyValue(): string | undefined;
}

export abstract class PeripheralBaseNode extends BasePeripheral {
  public format: NumberFormat;
  public pinned: boolean;
  public readonly name: string;
  public session: DebugSession;

  constructor(protected readonly parent?: PeripheralBaseNode) {
    super(parent);
    this.format = NumberFormat.Auto;
    this.pinned = false;
  }

  public selected(): Thenable<boolean> {
    return Promise.resolve(false);
  }

  public abstract performUpdate(): Thenable<any>;
  public abstract updateData(): Thenable<boolean>;

  public abstract getChildren():
    | PeripheralBaseNode[]
    | Promise<PeripheralBaseNode[]>;
  public abstract getPeripheral(): PeripheralBaseNode;

  public abstract collectRanges(addRanges: AddrRange[]): void;

  public abstract saveState(path?: string): NodeSetting[];
  public abstract findByPath(path?: string[]): PeripheralBaseNode;
}
