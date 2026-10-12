/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 12th October 2026
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
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

import { ExtensionContext } from "vscode";
import { registerBuildCommands } from "../build";
import { registerBuildFlashMonitorCommands } from "../buildFlashMonitor";
import { registerClangCommands } from "../clang";
import { checkAndPromptForClangdExtension } from "../clang/checkClangExtension";
import { addCmakeFileSystemWatcher } from "../cmake";
import {
  checkAndNotifyMissingCompileCommands,
  showWalkthroughOnFirstActivation,
} from "../common/activation";
import { PreCheck } from "../common/PreCheck";
import { registerTaskCommands } from "../common/taskCommands";
import {
  configureForWorkspace,
  registerOnDidWorkspaceFolderChanges,
} from "../common/workspaceChange";
import { registerComponentManagerCmd } from "../component-manager";
import { ESP } from "../config";
import { registerWorkspaceConfigurationCommands } from "../configuration";
import { registerCoverageCommands } from "../coverage";
import { registerDebugCommands } from "../debugAdapter";
import { registerEfuseCommands } from "../efuse";
import { registerEraseFlashCommand } from "../eraseFlash";
import { registerEspAdfCmd } from "../espAdf/espAdfDownload";
import { registerEspBomCommands } from "../espBom";
import { registerAddArduinoAsComponentCmd } from "../espIdf/arduino";
import { registerSearchInEspIdfDocsCommand } from "../espIdf/documentation";
import { registerHintsCommands } from "../espIdf/hints";
import { registerMenuconfigCommands } from "../espIdf/menuconfig";
import { registerMonitorCommands } from "../espIdf/monitor";
import { registerNVSCommand } from "../espIdf/nvs";
import { registerOpenOCDCommands } from "../espIdf/openOcd";
import { registerPartitionTableCommands } from "../espIdf/partition-table";
import { registerReconfigureCmd } from "../espIdf/reconfigure/task";
import { registerSerialPortCmds } from "../espIdf/serial";
import { registerSetTargetCommand } from "../espIdf/setTarget";
import { registerIdfSizeUICmd } from "../espIdf/size";
import { registerAppTraceCommands } from "../espIdf/tracing";
import { addUnitTestCommands } from "../espIdf/unitTest";
import { registerFlashCommands } from "../flash";
import { KconfigLangClient } from "../kconfig";
import { activateLanguageTool } from "../langTools";
import { registerWorkspaceNewProjectCommands } from "../newProject";
import { registerNinjaSummaryCommand } from "../ninja";
import { ProjectConfigurationManager } from "../project-conf/ProjectConfigurationManager";
import { registerProjectConfigCommands } from "../project-conf";
import { registerQEMUCommands } from "../qemu";
import { createCmdsStatusBarItems, statusBarItems } from "../statusBar";
import { registerOnDidChangeConfiguration } from "../common/configurationChange";
import { registerTroubleshootPanelCommand } from "../support";
import { registerCustomTaskCommand } from "../taskManager";
import { registerIdfTerminalCommand } from "../terminal";
import { registerFsImageCommands } from "../espIdf/fsImage";
import { registerFullCleanCmd } from "../clean";
import { disposeNonConfiguredStatusBar } from "./nonConfigured";

let configuredActivated = false;

export async function activateConfigured(context: ExtensionContext) {
  if (configuredActivated) {
    return;
  }
  configuredActivated = true;
  disposeNonConfiguredStatusBar();

  if (PreCheck.isRunningInVSCodeFork()) {
    checkAndPromptForClangdExtension();
  }
  KconfigLangClient.startKconfigLangServer(context);
  activateLanguageTool(context);
  registerDebugCommands(context);
  if (PreCheck.isWorkspaceFolderOpen()) {
    const workspaceFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
    if (Object.keys(statusBarItems).length === 0) {
      await createCmdsStatusBarItems(context, workspaceFolder.uri);
    }
    await configureForWorkspace(context, workspaceFolder);
    new ProjectConfigurationManager(
      workspaceFolder.uri,
      context,
      statusBarItems
    );
  }
  addCmakeFileSystemWatcher(context);
  await registerHintsCommands(context);
  registerOnDidWorkspaceFolderChanges(context);
  registerFullCleanCmd(context);
  registerAddArduinoAsComponentCmd(context);
  registerWorkspaceConfigurationCommands(context);
  registerEspAdfCmd(context);
  registerSerialPortCmds(context);
  registerReconfigureCmd(context);
  registerCustomTaskCommand(context);
  registerProjectConfigCommands(context);
  registerPartitionTableCommands(context);
  registerFsImageCommands(context);
  registerOnDidChangeConfiguration(context);
  registerCoverageCommands(context);
  registerTaskCommands(context);
  registerSearchInEspIdfDocsCommand(context);
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
  registerWorkspaceNewProjectCommands(context);
  registerIdfSizeUICmd(context);
  registerClangCommands(context);
  registerAppTraceCommands(context);
  registerOpenOCDCommands(context);
  registerQEMUCommands(context);
  registerTroubleshootPanelCommand(context);
  registerNinjaSummaryCommand(context);
  registerEspBomCommands(context);
  registerNVSCommand(context);
  registerComponentManagerCmd(context);
  showWalkthroughOnFirstActivation();
  checkAndNotifyMissingCompileCommands();
}
