/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 13th September 2024 6:03:21 pm
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

import {
  l10n,
  StatusBarAlignment,
  StatusBarItem,
  TreeItemCheckboxState,
  Uri,
  window,
} from "vscode";
import { getCurrentIdfSetup } from "../versionSwitcher";
import { readParameter } from "../idfConfiguration";
import { ESP } from "../config";
import { CommandItem } from "../cmdTreeView/cmdTreeDataProvider";
import { advancedCommandDictionary, AdvancedCommandKeys, commandDictionary, CommandKeys } from "../cmdTreeView/cmdStore";

export const statusBarItems: { [key: string]: StatusBarItem } = {};

export function updateStatusBarItemVisibility(cmdItem: CommandItem) {
  for (let statusBarItemKey of Object.keys(statusBarItems)) {
    if (statusBarItems[statusBarItemKey].command === cmdItem.command.command) {
      cmdItem.checkboxState === TreeItemCheckboxState.Checked
        ? statusBarItems[statusBarItemKey].show()
        : statusBarItems[statusBarItemKey].hide();
    }
  }
}

export async function createCmdsStatusBarItems(workspaceFolder: Uri) {
  const enableStatusBar = readParameter("idf.enableStatusBar") as boolean;
  if (!enableStatusBar) {
    return {};
  }
  const port = readParameter("idf.port", workspaceFolder) as string;
  let idfTarget = readParameter("idf.adapterTargetName", workspaceFolder);
  let flashType = readParameter("idf.flashType", workspaceFolder) as string;
  let projectConf = ESP.ProjectConfiguration.store.get<string>(
    ESP.ProjectConfiguration.SELECTED_CONFIG
  );
  if (idfTarget === "custom") {
    idfTarget = readParameter("idf.customAdapterTargetName", workspaceFolder);
  }
  let currentIdfVersion = await getCurrentIdfSetup(workspaceFolder, false);

  statusBarItems["currentIdfVersion"] = createStatusBarItem(
    `$(${commandDictionary[CommandKeys.SelectCurrentIdfVersion].iconId}) ESP-IDF v${
      currentIdfVersion.version
    }`,
    commandDictionary[CommandKeys.SelectCurrentIdfVersion].tooltip,
    CommandKeys.SelectCurrentIdfVersion,
    102
  );

  statusBarItems["flashType"] = createStatusBarItem(
    `$(${commandDictionary[CommandKeys.SelectFlashType].iconId}) ${flashType}`,
    commandDictionary[CommandKeys.SelectFlashType].tooltip,
    CommandKeys.SelectFlashType,
    101
  );

  statusBarItems["port"] = createStatusBarItem(
    `$(${commandDictionary[CommandKeys.SelectSerialPort].iconId}) ${port}`,
    commandDictionary[CommandKeys.SelectSerialPort].tooltip,
    CommandKeys.SelectSerialPort,
    100
  );

  if (projectConf) {
    statusBarItems["projectConf"] = createStatusBarItem(
      `$(${advancedCommandDictionary[AdvancedCommandKeys.SelectProjectConfiguration].iconId}) ${projectConf}`,
      advancedCommandDictionary[AdvancedCommandKeys.SelectProjectConfiguration].tooltip,
      AdvancedCommandKeys.SelectProjectConfiguration,
      99
    );
  }

  statusBarItems["target"] = createStatusBarItem(
    `$(${commandDictionary[CommandKeys.SetEspressifTarget].iconId}) ${idfTarget}`,
    commandDictionary[CommandKeys.SetEspressifTarget].tooltip,
    CommandKeys.SetEspressifTarget,
    98
  );
  statusBarItems["workspace"] = createStatusBarItem(
    `$(${commandDictionary[CommandKeys.pickWorkspace].iconId})`,
    commandDictionary[CommandKeys.pickWorkspace].tooltip,
    CommandKeys.pickWorkspace,
    97
  );
  statusBarItems["menuconfig"] = createStatusBarItem(
    `$(${commandDictionary[CommandKeys.SDKConfig].iconId})`,
    commandDictionary[CommandKeys.SDKConfig].tooltip,
    CommandKeys.SDKConfig,
    96
  );
  statusBarItems["clean"] = createStatusBarItem(
    `$(${commandDictionary[CommandKeys.FullClean].iconId})`,
    commandDictionary[CommandKeys.FullClean].tooltip,
    CommandKeys.FullClean,
    95
  );
  statusBarItems["build"] = createStatusBarItem(
    `$(${commandDictionary[CommandKeys.Build].iconId})`,
    commandDictionary[CommandKeys.Build].tooltip,
    CommandKeys.Build,
    94
  );
  statusBarItems["flash"] = createStatusBarItem(
    `$(${commandDictionary[CommandKeys.Flash].iconId})`,
    commandDictionary[CommandKeys.Flash].tooltip,
    CommandKeys.Flash,
    93
  );
  statusBarItems["monitor"] = createStatusBarItem(
    `$(${commandDictionary[CommandKeys.Monitor].iconId})`,
    commandDictionary[CommandKeys.Monitor].tooltip,
    CommandKeys.Monitor,
    92
  );
  statusBarItems["debug"] = createStatusBarItem(
    `$(${commandDictionary[CommandKeys.Debug].iconId})`,
    commandDictionary[CommandKeys.Debug].tooltip,
    CommandKeys.Debug,
    91
  );
  statusBarItems["buildFlashMonitor"] = createStatusBarItem(
    `$(${commandDictionary[CommandKeys.BuildFlashMonitor].iconId})`,
    commandDictionary[CommandKeys.BuildFlashMonitor].tooltip,
    CommandKeys.BuildFlashMonitor,
    90
  );
  statusBarItems["terminal"] = createStatusBarItem(
    `$(${commandDictionary[CommandKeys.IDFTerminal].iconId})`,
    commandDictionary[CommandKeys.IDFTerminal].tooltip,
    CommandKeys.IDFTerminal,
    89
  );
  statusBarItems["espIdf.customTask"] = createStatusBarItem(
    `$(${commandDictionary[CommandKeys.CustomTask].iconId})`,
    commandDictionary[CommandKeys.CustomTask].tooltip,
    CommandKeys.CustomTask,
    88
  );
  return statusBarItems;
}

export function createStatusBarItem(
  icon: string,
  tooltip: string,
  cmd: string,
  priority: number
) {
  const alignment: StatusBarAlignment = StatusBarAlignment.Left;
  const statusBarItem = window.createStatusBarItem(alignment, priority);
  statusBarItem.text = icon;
  statusBarItem.tooltip = tooltip;
  statusBarItem.command = cmd;
  statusBarItem.show();
  return statusBarItem;
}
