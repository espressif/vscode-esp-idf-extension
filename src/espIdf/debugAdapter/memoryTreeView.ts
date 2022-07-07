/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 28th June 2022 4:05:21 pm
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
  DebugSession,
  Event,
  EventEmitter,
  ThemeIcon,
  TreeDataProvider,
  TreeItem,
  Uri,
} from "vscode";
import { Peripheral } from "./nodes/peripheral";

export class EspIdfDebugMemoryViewTreeDataProvider
  implements TreeDataProvider<Peripheral> {
  private _onDidChangeTreeData: EventEmitter<
    Peripheral
  > = new EventEmitter<Peripheral>();
  private memoryItems: Peripheral[];
  private workspaceFolder: Uri;
  private isSessionActive: boolean = false;

  readonly onDidChangeTreeData: Event<Peripheral> = this
    ._onDidChangeTreeData.event;

  constructor(private debugSession: DebugSession) {
    this.workspaceFolder = this.debugSession.workspaceFolder.uri;
  }

  refresh() {
    if (!this.isSessionActive) {
      for (const memItem in this.memoryItems) {
        if (Object.prototype.hasOwnProperty.call(this.memoryItems, memItem)) {
          const element = this.memoryItems[memItem];
          this.debugSession.customRequest("readMemory", { addr: this.memoryItems[memItem]}).then((response) => {
            this.memoryItems[memItem] 
          });
        }
      }
    }
    this._onDidChangeTreeData.fire(null);
  }

  getTreeItem(element: Peripheral): TreeItem {
    return element;
  }

  getChildren(element?: Peripheral): Peripheral[] {
    if (!this.isSessionActive) {
      return [];
    }
    return this.memoryItems;
  }
}
