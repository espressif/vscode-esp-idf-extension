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
import { disposeActivation, runActivation } from "./activation";
import { ConfserverProcess } from "./espIdf/menuconfig/confserver/confServerProcess";
import { readParameter } from "./configuration/idf";
import { migrateLegacyWinPortAndBuildPathSettings } from "./configuration/migrateWinSettings";
import { resetIdfConfigurationSource } from "./configuration/idfConfigurationSource";
import { Logger } from "./common/logger";
import { OutputChannel } from "./common/outputChannel";
import { Telemetry } from "./common/telemetry";
import { ESP } from "./config";
import { RainmakerStore } from "./rainmaker/store";
import { espIdfCoverageRenderer } from "./coverage/renderer";
import { KconfigLangClient } from "./kconfig";
import { ExtensionConfigStore } from "./common/store";
import { ProjectConfigStore } from "./project-conf";
import { statusBarItems } from "./statusBar";
import { initCommandDictionary } from "./cmdTreeView/cmdStore";
import { clearSelectedProjectConfiguration } from "./project-conf/ProjectConfigurationManager";
import { unregisterEspressifMcpServers } from "./mcp/espressifMcpServers";
import { IDFMonitor } from "./espIdf/monitor/terminal";
import { ExtensionContext } from "vscode";

export async function activate(context: ExtensionContext) {
  // Always load Logger first
  OutputChannel.init();
  Logger.init(context);
  resetIdfConfigurationSource();
  ESP.GlobalConfiguration.store = ExtensionConfigStore.init(context);
  await migrateLegacyWinPortAndBuildPathSettings(context);
  ESP.ProjectConfiguration.store = ProjectConfigStore.init(context);

  context.environmentVariableCollection.clear();

  // Only clear selected project configuration if the setting is disabled
  const saveLastProjectConfiguration = readParameter(
    "idf.saveLastProjectConfiguration"
  );
  if (saveLastProjectConfiguration === false) {
    clearSelectedProjectConfiguration();
  }

  initCommandDictionary();
  ESP.Rainmaker.store = RainmakerStore.init(context);
  Telemetry.init((readParameter("idf.telemetry") as boolean) || false);
  await runActivation(context);
}

export function deactivate() {
  Telemetry.dispose();
  if (IDFMonitor.terminal) {
    IDFMonitor.dispose();
  }
  OutputChannel.end();
  ConfserverProcess.dispose();
  disposeActivation();
  for (const item in statusBarItems) {
    statusBarItems[item].dispose();
  }
  espIdfCoverageRenderer.dispose();
  KconfigLangClient.stopKconfigLangServer();
  unregisterEspressifMcpServers();
}
