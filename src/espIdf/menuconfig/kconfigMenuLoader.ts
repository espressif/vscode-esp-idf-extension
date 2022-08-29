/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 21st June 2019 10:57:18 am
 * Copyright 2019 Espressif Systems (Shanghai) CO LTD
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

import * as path from "path";
import * as vscode from "vscode";
import { readParameter } from "../../idfConfiguration";
import { LocDictionary } from "../../localizationDictionary";
import { readFileSync } from "../../utils";
import { formatHelpText } from "./helpTextFormatter";
import { Menu, menuType } from "./Menu";

export class KconfigMenuLoader {
  public static updateValues(
    config: Menu,
    values: { values: {}; visible: {}; ranges: {} }
  ): Menu {
    const newConfig: Menu = config;
    if (
      values.values.hasOwnProperty(newConfig.name) &&
      newConfig.type !== menuType.choice
    ) {
      newConfig.value =
        newConfig.type === menuType.hex
          ? values.values[newConfig.name].toString(16)
          : values.values[newConfig.name];
    }
    if (values.visible.hasOwnProperty(newConfig.id)) {
      newConfig.isVisible = values.visible[newConfig.id];
    }
    if (values.ranges.hasOwnProperty(newConfig.name)) {
      newConfig.range = values.ranges[newConfig.name];
    }
    for (let i = 0; i < newConfig.children.length; i++) {
      newConfig.children[i] = this.updateValues(newConfig.children[i], values);
      if (newConfig.type === menuType.choice) {
        values.values[newConfig.children[i].name]
          ? (newConfig.value = newConfig.children[i].name)
          : (newConfig.children[i].value = false);
      }
    }
    return newConfig;
  }

  private locDic: LocDictionary;
  private workspaceFolder: vscode.Uri;

  constructor(workspaceFolder: vscode.Uri) {
    this.workspaceFolder = workspaceFolder;
    this.locDic = new LocDictionary(__filename);
  }

  public initMenuconfigServer(): Menu[] {
    const buildDirName = readParameter(
      "idf.buildDirectoryName",
      this.workspaceFolder
    ) as string;
    const kconfigMenusPath = path.join(
      buildDirName,
      "config",
      "kconfig_menus.json"
    );
    const kconfigJson = JSON.parse(readFileSync(kconfigMenusPath));

    const configs: Menu[] = [];
    for (const config of kconfigJson) {
      const menu: Menu = this.mapJsonToMenuObject(config);
      configs.push(menu);
    }
    return configs;
  }

  public mapJsonToMenuObject(config): Menu {
    const menu: Menu = {
      id: config.id,
      name: config.name,
      help: formatHelpText(config.help),
      range: config.range,
      title: config.title,
      type: config.type,
      isCollapsed: false,
      isMenuconfig: config.is_menuconfig,
      isVisible: false,
      dependsOn: config.depends_on,
      children: [],
      value: null,
    };
    for (const child of config.children) {
      const childMenu: Menu = this.mapJsonToMenuObject(child);
      menu.children.push(childMenu);
    }
    return menu;
  }
}
