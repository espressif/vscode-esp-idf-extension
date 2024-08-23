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
import { ThemeColor, ThemeIcon, TreeItemCollapsibleState } from "vscode";

export function ConnectBoardItem(): ESPEFuseTreeDataItem {
  const item = new ESPEFuseTreeDataItem("Connect your board first");
  item.commandId = "esp.efuse.summary";
  item.iconPath = ThemeIconFor("debug-disconnect", "errorForeground");
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
    i.iconPath = ThemeIconFor("group-by-ref-type", "button.background");
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
    item.description =
      typeof v.value === "boolean" || typeof v.value === "number"
        ? JSON.stringify(v.value)
        : v.value;
    item.iconPath = v.writeable
      ? ThemeIconFor("edit", "merge.currentHeaderBackground")
      : ThemeIconFor("book", "button.background");
    return item;
  });
}

function ThemeIconFor(name: string, color: string): ThemeIcon {
  return new ThemeIcon(name, new ThemeColor(color));
}
