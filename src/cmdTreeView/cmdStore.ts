/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 13th September 2024 5:42:41 pm
 * Copyright 2024 Espressif Systems (Shanghai) CO LTD
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

import { l10n, TreeItemCheckboxState } from "vscode";
import { ESP } from "../config";

export interface IDFCommandDescription {
  checkboxState?: TreeItemCheckboxState;
  iconId: string;
  tooltip: string;
}

export enum IDFWebCommandKeys {
  Flash = "espIdfWeb.flash",
  Monitor = "espIdfWeb.monitor"
}

export enum CommandKeys {
  pickWorkspace = "espIdf.pickAWorkspaceFolder",
  SelectCurrentIdfVersion = "espIdf.selectCurrentIdfVersion",
  SelectFlashType = "espIdf.selectFlashMethodAndFlash",
  SelectSerialPort = "espIdf.selectPort",
  SelectProjectConfiguration = "espIdf.projectConf",
  SetEspressifTarget = "espIdf.setTarget",
  SDKConfig = "espIdf.menuconfig.start",
  FullClean = "espIdf.fullClean",
  Build = "espIdf.buildDevice",
  Flash = "espIdf.flashDevice",
  Monitor = "espIdf.monitorDevice",
  Debug = "espIdf.debug",
  BuildFlashMonitor = "espIdf.buildFlashMonitor",
  IDFTerminal = "espIdf.createIdfTerminal",
  CustomTask = "espIdf.customTask",
  QemuServer = "espIdf.qemuCommand",
  OpenOCD = "espIdf.openOCDCommand",
}

export enum AdvancedCommandKeys {
  InstallManager = "espIdf.installManager",
  Setup = "espIdf.setup.start",
  Examples = "espIdf.examples.start",
  NewProject = "espIdf.newProject.start",
  Size = "espIdf.size",
  EraseFlash = "espIdf.eraseFlash",
  DoctorCommand = "espIdf.doctorCommand",
  CreateFromIDFTemplate = "espIdf.createFiles",
  GetADF = "espIdf.getEspAdf",
  GetMDF = "espIdf.getEspMdf",
  GetEspMatter = "espIdf.getEspMatter",
  GetRainmaker = "espIdf.getEspRainmaker",
  ProjectConfEditor = "espIdf.projectConfigurationEditor",
  InstallIdfPythonReqs = "espIdf.installPyReqs",
  InstallMatterPythonReqs = "espIdf.installEspMatterPyReqs",
  CreateVscodeFolder = "espIdf.createVsCodeFolder",
  CreateDevContainerFolder = "espIdf.createDevContainer",
  CreateIdfComponent = "espIdf.createNewComponent",
  JtagFlash = "espIdf.jtag_flash",
  UartFlash = "espIdf.flashUart",
  DfuFlash = "espIdf.flashDFU",
  WebsocketMonitor = "espIdf.launchWSServerAndMonitor",
}

export function createAdvancedCommandDictionary(): Record<
  AdvancedCommandKeys,
  IDFCommandDescription
> {
  return {
    [AdvancedCommandKeys.InstallManager]: {
      checkboxState: undefined,
      iconId: "link-external",
      tooltip: l10n.t("Open ESP-IDF Installation Manager"),
    },
    [AdvancedCommandKeys.Setup]: {
      checkboxState: undefined,
      iconId: "extensions",
      tooltip: l10n.t("Configure ESP-IDF Extension"),
    },
    [AdvancedCommandKeys.Examples]: {
      checkboxState: undefined,
      iconId: "book",
      tooltip: l10n.t("Show Examples"),
    },
    [AdvancedCommandKeys.NewProject]: {
      checkboxState: undefined,
      iconId: "add",
      tooltip: l10n.t("New Project Wizard"),
    },
    [AdvancedCommandKeys.DoctorCommand]: {
      checkboxState: undefined,
      iconId: "bug",
      tooltip: l10n.t("Doctor Command"),
    },
    [AdvancedCommandKeys.Size]: {
      checkboxState: undefined,
      iconId: "info",
      tooltip: l10n.t("ESP-IDF Size"),
    },
    [AdvancedCommandKeys.EraseFlash]: {
      checkboxState: undefined,
      iconId: "close-all",
      tooltip: l10n.t("Erase Flash"),
    },
    [AdvancedCommandKeys.CreateFromIDFTemplate]: {
      checkboxState: undefined,
      iconId: "add",
      tooltip: l10n.t("Create ESP-IDF From Extension Templates"),
    },
    [AdvancedCommandKeys.GetADF]: {
      checkboxState: undefined,
      iconId: "extensions",
      tooltip: l10n.t("Install ESP-ADF"),
    },
    [AdvancedCommandKeys.GetMDF]: {
      checkboxState: undefined,
      iconId: "extensions",
      tooltip: l10n.t("Install ESP-MDF"),
    },
    [AdvancedCommandKeys.GetEspMatter]: {
      checkboxState: undefined,
      iconId: "extensions",
      tooltip: l10n.t("Install ESP-Matter"),
    },
    [AdvancedCommandKeys.GetRainmaker]: {
      checkboxState: undefined,
      iconId: "extensions",
      tooltip: l10n.t("Install ESP-Rainmaker"),
    },
    [AdvancedCommandKeys.ProjectConfEditor]: {
      checkboxState: undefined,
      iconId: "project",
      tooltip: l10n.t("Project Configuration editor"),
    },
    [AdvancedCommandKeys.InstallIdfPythonReqs]: {
      checkboxState: undefined,
      iconId: "extensions",
      tooltip: l10n.t("Install Extension Python Requirements"),
    },
    [AdvancedCommandKeys.InstallMatterPythonReqs]: {
      checkboxState: undefined,
      iconId: "extensions",
      tooltip: l10n.t("Install ESP-Matter Python Requirements"),
    },
    [AdvancedCommandKeys.CreateVscodeFolder]: {
      checkboxState: undefined,
      iconId: "add",
      tooltip: l10n.t("Add .vscode subdirectory files"),
    },
    [AdvancedCommandKeys.CreateDevContainerFolder]: {
      checkboxState: undefined,
      iconId: "add",
      tooltip: l10n.t("Add .devcontainer subdirectory files"),
    },
    [AdvancedCommandKeys.CreateIdfComponent]: {
      checkboxState: undefined,
      iconId: "add",
      tooltip: l10n.t("Create ESP-IDF Component"),
    },
    [AdvancedCommandKeys.JtagFlash]: {
      checkboxState: undefined,
      iconId: "zap",
      tooltip: l10n.t("Flash with JTAG"),
    },
    [AdvancedCommandKeys.UartFlash]: {
      checkboxState: undefined,
      iconId: "zap",
      tooltip: l10n.t("Flash with UART"),
    },
    [AdvancedCommandKeys.DfuFlash]: {
      checkboxState: undefined,
      iconId: "zap",
      tooltip: l10n.t("Flash with DFU"),
    },
    [AdvancedCommandKeys.WebsocketMonitor]: {
      checkboxState: undefined,
      iconId: "device-desktop",
      tooltip: l10n.t("Launch Websocket server and IDF Monitor"),
    },
  };
}

export function createCommandDictionary(): Record<
  CommandKeys,
  IDFCommandDescription
> {
  return {
    [CommandKeys.pickWorkspace]: {
      checkboxState: ESP.GlobalConfiguration.store.get<TreeItemCheckboxState>(
        CommandKeys.pickWorkspace,
        TreeItemCheckboxState.Checked
      ),
      iconId: "file-submodule",
      tooltip: l10n.t("Select Current Project workspace folder"),
    },
    [CommandKeys.SelectCurrentIdfVersion]: {
      checkboxState: ESP.GlobalConfiguration.store.get<TreeItemCheckboxState>(
        CommandKeys.SelectCurrentIdfVersion,
        TreeItemCheckboxState.Checked
      ),
      iconId: "octoface",
      tooltip: l10n.t("Select current ESP-IDF version"),
    },
    [CommandKeys.SelectFlashType]: {
      checkboxState: ESP.GlobalConfiguration.store.get<TreeItemCheckboxState>(
        CommandKeys.SelectFlashType,
        TreeItemCheckboxState.Checked
      ),
      iconId: "star-empty",
      tooltip: l10n.t("ESP-IDF: Select Flash Method"),
    },
    [CommandKeys.SelectSerialPort]: {
      checkboxState: ESP.GlobalConfiguration.store.get<TreeItemCheckboxState>(
        CommandKeys.SelectSerialPort,
        TreeItemCheckboxState.Checked
      ),
      iconId: "plug",
      tooltip: l10n.t("Select Port to Use (COM, tty, usbserial)"),
    },
    [CommandKeys.SelectProjectConfiguration]: {
      checkboxState: ESP.GlobalConfiguration.store.get<TreeItemCheckboxState>(
        CommandKeys.SelectProjectConfiguration,
        TreeItemCheckboxState.Checked
      ),
      iconId: "versions",
      tooltip: l10n.t("Select Project Configuration"),
    },
    [CommandKeys.SetEspressifTarget]: {
      checkboxState: ESP.GlobalConfiguration.store.get<TreeItemCheckboxState>(
        CommandKeys.SetEspressifTarget,
        TreeItemCheckboxState.Checked
      ),
      iconId: "chip",
      tooltip: l10n.t("Set Espressif Device Target (IDF_TARGET"),
    },
    [CommandKeys.SDKConfig]: {
      checkboxState: ESP.GlobalConfiguration.store.get<TreeItemCheckboxState>(
        CommandKeys.SDKConfig,
        TreeItemCheckboxState.Checked
      ),
      iconId: "gear",
      tooltip: l10n.t("SDK Configuration Editor (menuconfig)"),
    },
    [CommandKeys.FullClean]: {
      checkboxState: ESP.GlobalConfiguration.store.get<TreeItemCheckboxState>(
        CommandKeys.FullClean,
        TreeItemCheckboxState.Checked
      ),
      iconId: "trash",
      tooltip: l10n.t("Full Clean"),
    },
    [CommandKeys.Build]: {
      checkboxState: ESP.GlobalConfiguration.store.get<TreeItemCheckboxState>(
        CommandKeys.Build,
        TreeItemCheckboxState.Checked
      ),
      iconId: "symbol-property",
      tooltip: l10n.t("Build Project"),
    },
    [CommandKeys.Flash]: {
      checkboxState: ESP.GlobalConfiguration.store.get<TreeItemCheckboxState>(
        CommandKeys.Flash,
        TreeItemCheckboxState.Checked
      ),
      iconId: "zap",
      tooltip: l10n.t("Flash Device"),
    },
    [CommandKeys.Monitor]: {
      checkboxState: ESP.GlobalConfiguration.store.get<TreeItemCheckboxState>(
        CommandKeys.Monitor,
        TreeItemCheckboxState.Checked
      ),
      iconId: "device-desktop",
      tooltip: l10n.t("Monitor Device"),
    },
    [CommandKeys.BuildFlashMonitor]: {
      checkboxState: ESP.GlobalConfiguration.store.get<TreeItemCheckboxState>(
        CommandKeys.BuildFlashMonitor,
        TreeItemCheckboxState.Checked
      ),
      iconId: "flame",
      tooltip: l10n.t("ESP-IDF: Build, Flash and Monitor"),
    },
    [CommandKeys.OpenOCD]: {
      checkboxState: ESP.GlobalConfiguration.store.get<TreeItemCheckboxState>(
        CommandKeys.OpenOCD,
        TreeItemCheckboxState.Checked
      ),
      iconId: "server-environment",
      tooltip: l10n.t("[OpenOCD Server]"),
    },
    [CommandKeys.Debug]: {
      checkboxState: ESP.GlobalConfiguration.store.get<TreeItemCheckboxState>(
        CommandKeys.Debug,
        TreeItemCheckboxState.Checked
      ),
      iconId: "debug-alt",
      tooltip: l10n.t("Debug"),
    },
    [CommandKeys.IDFTerminal]: {
      checkboxState: ESP.GlobalConfiguration.store.get<TreeItemCheckboxState>(
        CommandKeys.IDFTerminal,
        TreeItemCheckboxState.Checked
      ),
      iconId: "terminal",
      tooltip: l10n.t("Open ESP-IDF Terminal"),
    },
    [CommandKeys.CustomTask]: {
      checkboxState: ESP.GlobalConfiguration.store.get<TreeItemCheckboxState>(
        CommandKeys.CustomTask,
        TreeItemCheckboxState.Checked
      ),
      iconId: "diff-renamed",
      tooltip: l10n.t("Execute Custom Task"),
    },
    [CommandKeys.QemuServer]: {
      checkboxState: ESP.GlobalConfiguration.store.get<TreeItemCheckboxState>(
        CommandKeys.QemuServer,
        TreeItemCheckboxState.Checked
      ),
      iconId: "server-environment",
      tooltip: l10n.t("Start/Stop QEMU Server"),
    },
  };
}
