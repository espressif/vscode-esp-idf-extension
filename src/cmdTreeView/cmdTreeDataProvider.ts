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
  ProviderResult,
  ThemeIcon,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  window,
} from "vscode";

export class CommandsProvider implements TreeDataProvider<CommandItem> {
  constructor() {}

  getTreeItem(element: CommandItem): TreeItem | Thenable<TreeItem> {
    return element;
  }

  getChildren(element?: CommandItem): ProviderResult<CommandItem[]> {

    const showExamples = new CommandItem("Show examples", "espIdf.examples.start", "book");

    const selectSerialPort = new CommandItem(
      "Select serial port",
      "espIdf.selectPort",
      "plug"
    );
    const setEspressifTarget = new CommandItem(
      "Set Espressif target (IDF_TARGET)",
      "espIdf.setTarget",
      "circuit-board"
    );
    const menuconfig = new CommandItem(
      "SDK Configuration Editor (menuconfig)",
      "espIdf.menuconfig.start",
      "gear"
    );
    const buildCmd = new CommandItem("Build", "espIdf.buildDevice", "database");

    const sizeCmd = new CommandItem("IDF Size", "espIdf.size", "info");

    const cleanCmd = new CommandItem("Full clean", "espIdf.fullClean", "trash");

    const flashCmd = new CommandItem("Flash", "espIdf.flashDevice", "zap");

    const eraseFlash = new CommandItem(
      "Erase flash",
      "espIdf.eraseFlash",
      "close-all"
    );

    const monitorCmd = new CommandItem(
      "Monitor",
      "espIdf.monitorDevice",
      "device-desktop"
    );

    const terminalCmd = new CommandItem(
      "ESP-IDF Terminal",
      "espIdf.createIdfTerminal",
      "terminal"
    );

    const doctorCmd = new CommandItem(
      "Doctor command",
      "espIdf.doctorCommand",
      "bug"
    )

    return [
      showExamples,
      selectSerialPort,
      setEspressifTarget,
      menuconfig,
      buildCmd,
      sizeCmd,
      cleanCmd,
      flashCmd,
      eraseFlash,
      monitorCmd,
      terminalCmd,
      doctorCmd
    ];
  }

  public registerDataProviderForTree(treeName: string) {
    return window.registerTreeDataProvider(treeName, this);
  }
}

export class CommandItem extends TreeItem {
  constructor(
    public readonly label: string,
    command: string,
    iconId: string,
    args?: string[]
  ) {
    super(label, TreeItemCollapsibleState.None);
    this.tooltip = label;
    this.command = {
      command: command,
      title: label,
      arguments: args,
    };
    this.iconPath = new ThemeIcon(iconId);
  }
}
