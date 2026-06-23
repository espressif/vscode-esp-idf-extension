// Copyright 2019 Espressif Systems (Shanghai) CO LTD
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

"use strict";
import { ConfserverProcess } from "./espIdf/menuconfig/confserver/confServerProcess";
import { readParameter } from "./configuration/idf";
import { resetIdfConfigurationSource } from "./configuration/idfConfigurationSource";
import { Logger } from "./common/logger";
import { OutputChannel } from "./common/outputChannel";
import { Telemetry } from "./common/telemetry";
import { registerRainMakerCommands } from "./rainmaker";
import { CommandsProvider } from "./cmdTreeView/cmdTreeDataProvider";
import { ESP } from "./config";
import { RainmakerStore } from "./rainmaker/store";
import { espIdfCoverageRenderer } from "./coverage/renderer";
import { registerMonitorCommands } from "./espIdf/monitor";
import { registerEspAdfCmd } from "./espAdf/espAdfDownload";
import { ChangelogViewer } from "./changelog-viewer";
import { KconfigLangClient } from "./kconfig";
import { ExtensionConfigStore } from "./common/store";
import { ProjectConfigStore } from "./project-conf";
import { UnitTest } from "./espIdf/unitTest/adapter";
import { registerReconfigureCmd } from "./espIdf/reconfigure/task";
import { createCmdsStatusBarItems, statusBarItems } from "./statusBar";
import { initCommandDictionary } from "./cmdTreeView/cmdStore";
import { registerRemoveEspIdfSettingsCommand } from "./uninstall";
import {
  clearSelectedProjectConfiguration,
  ProjectConfigurationManager,
} from "./project-conf/ProjectConfigurationManager";
import { registerClangCommands } from "./clang";
import { activateLanguageTool } from "./langTools";
import {
  checkAndNotifyMissingCompileCommands,
  checkIfActivateExtension,
  registerWalkthroughCommands,
} from "./common/activation";
import { PreCheck } from "./common/PreCheck";
import { registerBuildFlashMonitorCommands } from "./buildFlashMonitor";
import { checkAndPromptForClangdExtension } from "./clang/checkClangExtension";
import { registerBuildCommands } from "./build";
import { registerFlashCommands } from "./flash";
import { registerEraseFlashCommand } from "./eraseFlash";
import { IDFMonitor } from "./espIdf/monitor/terminal";
import { registerMenuconfigCommands } from "./espIdf/menuconfig";
import { registerIdfSizeUICmd } from "./espIdf/size";
import { registerDebugCommands } from "./debugAdapter";
import { registerIdfTerminalCommand } from "./terminal";
import { registerAddArduinoAsComponentCmd } from "./espIdf/arduino";
import { registerFullCleanCmd } from "./clean";
import { registerSerialPortCmds } from "./espIdf/serial";
import { registerCoverageCommands } from "./coverage";
import { addCmakeFileSystemWatcher } from "./cmake";
import { registerCustomTaskCommand } from "./taskManager";
import { registerNewProjectWizardCmd } from "./newProject";
import { addUnitTestCommands } from "./espIdf/unitTest";
import { registerSearchDocsCommand } from "./espIdf/documentation";
import { installManagerCommand } from "./eim";
import { registerQEMUCommands } from "./qemu";
import { registerOpenOCDCommands } from "./espIdf/openOcd";
import { registerSetTargetCommand } from "./espIdf/setTarget";
import { registerAppTraceCommands } from "./espIdf/tracing";
import { registerWelcomePanel } from "./welcome";
import { registerProjectConfigCommands } from "./project-conf";
import { registerDoctorCommand } from "./support";
import { registerNinjaSummaryCommand } from "./ninja";
import { registerEspBomCommands } from "./espBom";
import { registerNVSCommand } from "./espIdf/nvs";
import { registerHintsCommands } from "./espIdf/hints";
import {
  registerOnDidWorkspaceFolderChanges,
  useFirstWorkspaceFolder,
} from "./common/workspaceChange";
import { registerOnDidChangeConfiguration } from "./common/configurationChange";
import { registerTaskCommands } from "./common/taskCommands";
import { registerComponentManagerCmd } from "./component-manager";
import { ExtensionContext } from "vscode";
import { registerConfigurationCommands } from "./configuration";
import { registerPartitionTableCommands } from "./espIdf/partition-table";
import { registerEfuseCommands } from "./efuse";

export async function activate(context: ExtensionContext) {
  // Always load Logger first
  OutputChannel.init();
  Logger.init(context);
  resetIdfConfigurationSource();
  initCommandDictionary();
  ESP.GlobalConfiguration.store = ExtensionConfigStore.init(context);
  ESP.ProjectConfiguration.store = ProjectConfigStore.init(context);

  context.environmentVariableCollection.clear();

  // Only clear selected project configuration if the setting is disabled
  const saveLastProjectConfiguration = readParameter(
    "idf.saveLastProjectConfiguration"
  );
  if (saveLastProjectConfiguration === false) {
    clearSelectedProjectConfiguration();
  }

  ESP.Rainmaker.store = RainmakerStore.init(context);
  Telemetry.init((readParameter("idf.telemetry") as boolean) || false);
  ChangelogViewer.showChangeLogAndUpdateVersion(context);
  if (PreCheck.isRunningInVSCodeFork()) {
    checkAndPromptForClangdExtension();
  }
  if (!(await checkIfActivateExtension())) {
    return;
  }
  KconfigLangClient.startKconfigLangServer(context);
  activateLanguageTool(context);
  registerDebugCommands(context);
  new CommandsProvider(context);
  if (PreCheck.isWorkspaceFolderOpen()) {
    await useFirstWorkspaceFolder(context);
    const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
    await createCmdsStatusBarItems(context, wsFolder.uri);
    new ProjectConfigurationManager(wsFolder.uri, context, statusBarItems);
  }
  addCmakeFileSystemWatcher(context);
  await registerHintsCommands(context);
  registerOnDidWorkspaceFolderChanges(context);
  registerFullCleanCmd(context);
  registerAddArduinoAsComponentCmd(context);
  registerConfigurationCommands(context);
  registerEspAdfCmd(context);
  registerSerialPortCmds(context);
  registerReconfigureCmd(context);
  registerCustomTaskCommand(context);
  registerProjectConfigCommands(context);
  registerPartitionTableCommands(context);
  registerOnDidChangeConfiguration(context);
  registerCoverageCommands(context);
  registerTaskCommands(context);
  registerSearchDocsCommand(context);
  addUnitTestCommands(context);
  registerBuildCommands(context);
  registerFlashCommands(context);
  registerEraseFlashCommand(context);
  registerMonitorCommands(context);
  registerIdfTerminalCommand(context);
  registerEfuseCommands(context);
  registerBuildFlashMonitorCommands(context);
  registerMenuconfigCommands(context);
  registerSetTargetCommand(context);
  installManagerCommand(context);
  registerWelcomePanel(context);
  registerNewProjectWizardCmd(context);
  registerIdfSizeUICmd(context);
  registerClangCommands(context);
  registerAppTraceCommands(context);
  registerOpenOCDCommands(context);
  registerQEMUCommands(context);
  registerDoctorCommand(context);
  registerRainMakerCommands(context);
  registerNinjaSummaryCommand(context);
  registerEspBomCommands(context);
  registerNVSCommand(context);
  registerComponentManagerCmd(context);
  registerRemoveEspIdfSettingsCommand(context);
  registerWalkthroughCommands(context);
  checkAndNotifyMissingCompileCommands();
}

export function deactivate() {
  Telemetry.dispose();
  if (IDFMonitor.terminal) {
    IDFMonitor.dispose();
  }
  OutputChannel.end();
  ConfserverProcess.dispose();
  for (const item in statusBarItems) {
    statusBarItems[item].dispose();
  }
  espIdfCoverageRenderer.dispose();
  KconfigLangClient.stopKconfigLangServer();
}
