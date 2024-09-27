/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 20th November 2023 5:59:36 pm
 * Copyright 2023 Espressif Systems (Shanghai) CO LTD
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
  Event,
  EventEmitter,
  ProviderResult,
  ThemeIcon,
  TreeDataProvider,
  TreeItem,
  TreeItemCheckboxState,
  TreeItemCollapsibleState,
  window,
} from "vscode";
import { updateStatusBarItemVisibility } from "../statusBar";
import {
  AdvancedCommandKeys,
  CommandKeys,
  createAdvancedCommandDictionary,
  createCommandDictionary,
} from "./cmdStore";

export class CommandsProvider implements TreeDataProvider<CommandItem> {
  private _onDidChangeTreeData: EventEmitter<
    CommandItem | undefined | void
  > = new EventEmitter<CommandItem | undefined | void>();
  readonly onDidChangeTreeData: Event<CommandItem | undefined | void> = this
    ._onDidChangeTreeData.event;

  constructor() {}

  getTreeItem(element: CommandItem): TreeItem | Thenable<TreeItem> {
    return element;
  }

  getChildren(element?: CommandItem): ProviderResult<CommandItem[]> {
    if (element && element.commandType === CommandType.Category) {
      return this.getAdvancedCommands();
    }
    return this.getInitialCommands();
  }

  refresh(item?: CommandItem): void {
    this._onDidChangeTreeData.fire(item);
  }



  private getAdvancedCommands() {
    const cmdItemList: CommandItem[] = [];
    const advancedCommandDictionary = createAdvancedCommandDictionary();

    for (let advancedCmdKey of Object.values(AdvancedCommandKeys)) {
      let cmdItem = new CommandItem(
        advancedCommandDictionary[advancedCmdKey].tooltip,
        CommandType.Command,
        advancedCmdKey,
        advancedCommandDictionary[advancedCmdKey].iconId,
        advancedCommandDictionary[advancedCmdKey].checkboxState
      );
      cmdItemList.push(cmdItem);
    }
    return cmdItemList;
  }

  private getInitialCommands() {
    const cmdItemList: CommandItem[] = [];
    const commandDictionary = createCommandDictionary();
    for (let cmdKey of Object.values(CommandKeys)) {
      let cmdItem = new CommandItem(
        commandDictionary[cmdKey].tooltip,
        CommandType.Command,
        cmdKey,
        commandDictionary[cmdKey].iconId,
        commandDictionary[cmdKey].checkboxState
      );
      cmdItemList.push(cmdItem);
    }
    const advancedCategory = new CommandItem("Advanced", CommandType.Category);
    cmdItemList.push(advancedCategory);
    return cmdItemList;
  }

  public registerDataProviderForTree(treeName: string) {
    const treeView = window.createTreeView(treeName, {
      treeDataProvider: this,
    });
    treeView.onDidChangeCheckboxState((e) => {
      for (const cmdItem of e.items) {
        updateStatusBarItemVisibility(cmdItem[0]);
      }
    });
    return treeView;
  }
}

enum CommandType {
  Category,
  Command,
}

export class CommandItem extends TreeItem {
  public commandType: CommandType;
  constructor(
    public readonly label: string,
    commandType: CommandType,
    command?: string,
    iconId?: string,
    checkboxState?: TreeItemCheckboxState,
    args?: string[]
  ) {
    const isCollapsed =
      commandType === CommandType.Category
        ? TreeItemCollapsibleState.Collapsed
        : TreeItemCollapsibleState.None;
    super(label, isCollapsed);
    this.commandType = commandType;
    this.tooltip = label;
    if (command) {
      this.command = {
        command: command,
        title: label,
        arguments: args,
      };
    }
    if (iconId) {
      this.iconPath = new ThemeIcon(iconId);
    }
    if (typeof checkboxState !== undefined) {
      this.checkboxState = checkboxState;
    }
  }
}
