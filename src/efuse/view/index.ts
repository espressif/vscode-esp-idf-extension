/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 5th August 2020 3:36:07 pm
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
  TreeDataProvider,
  TreeItem,
  EventEmitter,
  window,
  Disposable,
} from "vscode";
import { ESPEFuseTreeDataItem } from "./item";
import {
  ConnectBoardItem,
  CategoryItemsFor,
  FieldsForCategory,
} from "./item_generator";
import { ESPEFuseSummary } from "..";

export class ESPEFuseTreeDataProvider
  implements TreeDataProvider<ESPEFuseTreeDataItem> {
  private espFuseSummaryData: ESPEFuseSummary;
  private _onDidChangeTreeData = new EventEmitter<ESPEFuseTreeDataItem>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  getTreeItem(e: ESPEFuseTreeDataItem): ESPEFuseTreeDataItem {
    return e;
  }

  async getChildren(e?: ESPEFuseTreeDataItem): Promise<ESPEFuseTreeDataItem[]> {
    if (!e) {
      if (!this.espFuseSummaryData) {
        return [ConnectBoardItem()];
      }
      return CategoryItemsFor(this.espFuseSummaryData);
    } else {
      return FieldsForCategory(e.label as string, this.espFuseSummaryData);
    }
  }

  load(data: ESPEFuseSummary): void {
    this.espFuseSummaryData = data;
  }

  refresh() {
    this._onDidChangeTreeData.fire(null);
  }

  public registerDataProviderForTree(treeName: string): Disposable {
    return window.registerTreeDataProvider(treeName, this);
  }
}
