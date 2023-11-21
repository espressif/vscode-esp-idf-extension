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
    if (element && element.commandType === CommandType.Category) {
      return this.getAdvancedCommands();
    }
    return this.getInitialCommands();
  }

  private getAdvancedCommands() {
    const createIdfTemplate = new CommandItem(
      "Create ESP-IDF From Extension Templates",
      CommandType.Command,
      "espIdf.createFiles",
      "add"
    );
    const getAdf = new CommandItem(
      "Install ESP-ADF",
      CommandType.Command,
      "espIdf.getEspAdf",
      "extensions"
    );
    const getMdf = new CommandItem(
      "Install ESP-MDF",
      CommandType.Command,
      "espIdf.getEspMdf",
      "extensions"
    );
    const getMatter = new CommandItem(
      "Install ESP-Matter",
      CommandType.Command,
      "espIdf.getEspMatter",
      "extensions"
    );
    const getRainmaker = new CommandItem(
      "Install ESP-Rainmaker",
      CommandType.Command,
      "espIdf.getEspRainmaker",
      "extensions"
    );
    const projectConfEditor = new CommandItem(
      "Project Configuration editor",
      CommandType.Command,
      "espIdf.projectConfigurationEditor",
      "extensions"
    );

    const installExtensionRequirements = new CommandItem(
      "Install Extension Python Requirements",
      CommandType.Command,
      "espIdf.installPyReqs",
      "extensions"
    );

    const installMatterRequirements = new CommandItem(
      "Install ESP-Matter Python Requirements",
      CommandType.Command,
      "espIdf.installEspMatterPyReqs",
      "extensions"
    );

    const createVscodeFolder = new CommandItem(
      "Add .vscode subdirectory files",
      CommandType.Command,
      "espIdf.createVsCodeFolder",
      "add"
    );
    const devContainerFolder = new CommandItem(
      "Add .devcontainer subdirectory files",
      CommandType.Command,
      "espIdf.createDevContainer",
      "add"
    );
    const createIdfComponent = new CommandItem(
      "Create ESP-IDF Component",
      CommandType.Command,
      "espIdf.createNewComponent",
      "add"
    );
    const jtagFlash = new CommandItem(
      "Flash with JTAG",
      CommandType.Command,
      "espIdf.jtag_flash",
      "zap"
    );
    const uartFlash = new CommandItem(
      "Flash with UART",
      CommandType.Command,
      "espIdf.jtag_flash",
      "zap"
    );
    const dfuFlash = new CommandItem(
      "Flash with DFU",
      CommandType.Command,
      "espIdf.flashDFU",
      "zap"
    );
    const websocketMonitor = new CommandItem(
      "Launch Websocket server and IDF Monitor",
      CommandType.Command,
      "espIdf.launchWSServerAndMonitor",
      "device-desktop"
    );

    const qemuServer = new CommandItem(
      "Start/Stop QEMU Server",
      CommandType.Command,
      "espIdf.qemuCommand",
      "server-environment"
    );

    return [
      createIdfTemplate,
      getAdf,
      getMdf,
      getMatter,
      getRainmaker,
      projectConfEditor,
      installExtensionRequirements,
      installMatterRequirements,
      createVscodeFolder,
      devContainerFolder,
      createIdfComponent,
      jtagFlash,
      uartFlash,
      dfuFlash,
      websocketMonitor,
      qemuServer,
    ];
  }

  private getInitialCommands() {
    const setupWizard = new CommandItem(
      "Configure ESP-IDF Extension",
      CommandType.Command,
      "espIdf.setup.start",
      "extensions"
    );
    const showExamples = new CommandItem(
      "Show Examples",
      CommandType.Command,
      "espIdf.examples.start",
      "book"
    );

    const newProject = new CommandItem(
      "New Project Wizard",
      CommandType.Command,
      "espIdf.newProject.start",
      "add"
    );

    const selectSerialPort = new CommandItem(
      "Select Serial Port",
      CommandType.Command,
      "espIdf.selectPort",
      "plug"
    );
    const setEspressifTarget = new CommandItem(
      "Set Espressif Target (IDF_TARGET)",
      CommandType.Command,
      "espIdf.setTarget",
      "circuit-board"
    );
    const menuconfig = new CommandItem(
      "SDK Configuration Editor (menuconfig)",
      CommandType.Command,
      "espIdf.menuconfig.start",
      "gear"
    );
    const buildCmd = new CommandItem(
      "Build",
      CommandType.Command,
      "espIdf.buildDevice",
      "database"
    );

    const sizeCmd = new CommandItem(
      "IDF Size",
      CommandType.Command,
      "espIdf.size",
      "info"
    );

    const cleanCmd = new CommandItem(
      "Full Clean",
      CommandType.Command,
      "espIdf.fullClean",
      "trash"
    );

    const flashCmd = new CommandItem(
      "Flash",
      CommandType.Command,
      "espIdf.flashDevice",
      "zap"
    );

    const eraseFlash = new CommandItem(
      "Erase Flash",
      CommandType.Command,
      "espIdf.eraseFlash",
      "close-all"
    );

    const monitorCmd = new CommandItem(
      "Monitor",
      CommandType.Command,
      "espIdf.monitorDevice",
      "device-desktop"
    );

    const openOCD = new CommandItem(
      "Start/Stop OpenOCD Server",
      CommandType.Command,
      "espIdf.openOCDCommand",
      "server-environment"
    );

    const terminalCmd = new CommandItem(
      "ESP-IDF Terminal",
      CommandType.Command,
      "espIdf.createIdfTerminal",
      "terminal"
    );

    const doctorCmd = new CommandItem(
      "Doctor Command",
      CommandType.Command,
      "espIdf.doctorCommand",
      "bug"
    );

    const advancedCategory = new CommandItem("Advanced", CommandType.Category);

    return [
      setupWizard,
      showExamples,
      newProject,
      selectSerialPort,
      setEspressifTarget,
      menuconfig,
      buildCmd,
      sizeCmd,
      cleanCmd,
      flashCmd,
      eraseFlash,
      monitorCmd,
      openOCD,
      terminalCmd,
      doctorCmd,
      advancedCategory,
    ];
  }

  public registerDataProviderForTree(treeName: string) {
    return window.registerTreeDataProvider(treeName, this);
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
  }
}
