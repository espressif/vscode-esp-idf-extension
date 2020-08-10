/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 5th August 2020 8:59:44 pm
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

import { ESPEFuseTreeDataItem } from "./item";
import { ESPEFuseSummary } from "..";
import { TreeItemCollapsibleState } from "vscode";

export function ConnectBoardItem(): ESPEFuseTreeDataItem {
  const item = new ESPEFuseTreeDataItem("Connect your board first");
  item.commandId = "esp.efuse.summary";
  item.themeIcon = "debug-disconnect";
  item.description = "(select serial port first)";
  return item;
}

export function CategoryItemsFor(
  data: ESPEFuseSummary
): ESPEFuseTreeDataItem[] {
  const items: Array<ESPEFuseTreeDataItem> = new Array(0);
  for (const category in data) {
    const i = new ESPEFuseTreeDataItem(category);
    i.collapsibleState = TreeItemCollapsibleState.Collapsed;
    i.themeIcon = "group-by-ref-type";
    i.description = `(${data[category].length}) fields`;
    items.push(i);
  }
  return items;
}

export function FieldsForCategory(
  category: string,
  data: ESPEFuseSummary
): ESPEFuseTreeDataItem[] {
  const fields = data[category];

  return fields.map((v) => {
    const item = new ESPEFuseTreeDataItem(v.name);
    item.tooltip = v.writeable ? "writable" : "read only";
    item.description = v.value;
    item.themeIcon = v.writeable
      ? "debug-breakpoint-data"
      : "debug-breakpoint-data-unverified";
    return item;
  });
}
