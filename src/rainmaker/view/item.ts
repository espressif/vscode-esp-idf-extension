/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 12th May 2020 7:33:23 pm
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
import { TreeItem, TreeItemCollapsibleState, ThemeIcon } from "vscode";

export enum RMakerItemType {
  None,
  Login = "login",
  Account = "account",
  Node = "node",
  Device = "device",
  Param = "param",
}

export class RMakerItem extends TreeItem {
  type: RMakerItemType;
  private _meta: any;

  public getMeta<T>(): T {
    return this._meta;
  }

  public set meta(v: any) {
    this._meta = v;
  }

  constructor(type: RMakerItemType, label?: string, tooltip?: string) {
    super(label);
    this.type = type;
    this.contextValue = type.toString();
    this.collapsibleState = TreeItemCollapsibleState.None;
    this.command = {
      title: label,
      command: "",
      tooltip: tooltip,
    };
  }

  public set commandId(v: string) {
    if (!this.command) {
      this.command = {
        title: "",
        command: v,
        tooltip: "",
      };
    }
    this.command.command = v;
  }

  public set themeIcon(v: string) {
    this.iconPath = new ThemeIcon(v);
  }
}
