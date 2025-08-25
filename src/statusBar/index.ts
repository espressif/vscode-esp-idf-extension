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

import * as path from "path";
import {
  env,
  StatusBarAlignment,
  StatusBarItem,
  TreeItemCheckboxState,
  UIKind,
  Uri,
  window,
  l10n,
  ThemeIcon,
} from "vscode";
import { getCurrentIdfSetup } from "../versionSwitcher";
import { readParameter } from "../idfConfiguration";
import { ESP } from "../config";
import { CommandItem } from "../cmdTreeView/cmdTreeDataProvider";
import { CommandKeys, createCommandDictionary } from "../cmdTreeView/cmdStore";
import { getIdfTargetFromSdkconfig } from "../workspaceConfig";
import { pathExists } from "fs-extra";

export const statusBarItems: { [key: string]: StatusBarItem } = {};

export function updateStatusBarItemVisibility(cmdItem: CommandItem) {
  for (let statusBarItemKey of Object.keys(statusBarItems)) {
    if (statusBarItems[statusBarItemKey].command === cmdItem.command.command) {
      cmdItem.checkboxState === TreeItemCheckboxState.Checked
        ? statusBarItems[statusBarItemKey].show()
        : statusBarItems[statusBarItemKey].hide();

      ESP.GlobalConfiguration.store.set(
        cmdItem.command.command,
        cmdItem.checkboxState
      );
    }
  }
}

export async function createCmdsStatusBarItems(workspaceFolder: Uri) {
  const commandDictionary = createCommandDictionary();
  const enableStatusBar = readParameter("idf.enableStatusBar") as boolean;
  if (!enableStatusBar) {
    return {};
  }
  const port = readParameter("idf.port", workspaceFolder) as string;
  const monitorPort = readParameter(
    "idf.monitorPort",
    workspaceFolder
  ) as string;
  let idfTarget = await getIdfTargetFromSdkconfig(workspaceFolder);
  let flashType = readParameter("idf.flashType", workspaceFolder) as string;
  let projectConf = ESP.ProjectConfiguration.store.get<string>(
    ESP.ProjectConfiguration.SELECTED_CONFIG
  );
  let projectConfPath = path.join(
    workspaceFolder.fsPath,
    ESP.ProjectConfiguration.PROJECT_CONFIGURATION_FILENAME
  );
  let projectConfExists = await pathExists(projectConfPath);

  let currentIdfVersion = await getCurrentIdfSetup(workspaceFolder, false);

  statusBarItems["workspace"] = createStatusBarItem(
    `$(${commandDictionary[CommandKeys.pickWorkspace].iconId})`,
    commandDictionary[CommandKeys.pickWorkspace].tooltip,
    CommandKeys.pickWorkspace,
    104,
    commandDictionary[CommandKeys.pickWorkspace].checkboxState
  );

  statusBarItems["currentIdfVersion"] = createStatusBarItem(
    `$(${
      commandDictionary[CommandKeys.SelectCurrentIdfVersion].iconId
    }) ESP-IDF v${currentIdfVersion.version}`,
    commandDictionary[CommandKeys.SelectCurrentIdfVersion].tooltip,
    CommandKeys.SelectCurrentIdfVersion,
    103,
    commandDictionary[CommandKeys.SelectCurrentIdfVersion].checkboxState
  );

  if (env.uiKind !== UIKind.Web) {
    statusBarItems["flashType"] = createStatusBarItem(
      `$(${
        commandDictionary[CommandKeys.SelectFlashType].iconId
      }) ${flashType}`,
      commandDictionary[CommandKeys.SelectFlashType].tooltip,
      CommandKeys.SelectFlashType,
      102,
      commandDictionary[CommandKeys.SelectFlashType].checkboxState
    );

    statusBarItems["port"] = createStatusBarItem(
      `$(${commandDictionary[CommandKeys.SelectSerialPort].iconId}) ${port}`,
      commandDictionary[CommandKeys.SelectSerialPort].tooltip,
      CommandKeys.SelectSerialPort,
      101,
      commandDictionary[CommandKeys.SelectSerialPort].checkboxState
    );

    statusBarItems["monitorPort"] = createStatusBarItem(
      `$(${
        commandDictionary[CommandKeys.SelectMonitorSerialPort].iconId
      }) ${monitorPort}`,
      commandDictionary[CommandKeys.SelectMonitorSerialPort].tooltip,
      CommandKeys.SelectMonitorSerialPort,
      100,
      commandDictionary[CommandKeys.SelectMonitorSerialPort].checkboxState
    );
    if (!monitorPort) {
      statusBarItems["monitorPort"].text = "";
      statusBarItems["monitorPort"].hide();
    }
  }

  // Only create the project configuration status bar item if the configuration file exists
  if (projectConfExists) {
    if (!projectConf) {
      // No configuration selected but file exists with configurations
      let statusBarItemName = "No Configuration Selected";
      let statusBarItemTooltip =
        "No project configuration selected. Click to select one";
      statusBarItems["projectConf"] = createStatusBarItem(
        `$(${
          commandDictionary[CommandKeys.SelectProjectConfiguration].iconId
        }) ${statusBarItemName}`,
        statusBarItemTooltip,
        CommandKeys.SelectProjectConfiguration,
        99,
        commandDictionary[CommandKeys.SelectProjectConfiguration].checkboxState
      );
    } else {
      // Valid configuration is selected
      statusBarItems["projectConf"] = createStatusBarItem(
        `$(${
          commandDictionary[CommandKeys.SelectProjectConfiguration].iconId
        }) ${projectConf}`,
        commandDictionary[CommandKeys.SelectProjectConfiguration].tooltip,
        CommandKeys.SelectProjectConfiguration,
        99,
        commandDictionary[CommandKeys.SelectProjectConfiguration].checkboxState
      );
    }
  } else if (statusBarItems["projectConf"]) {
    // If the configuration file doesn't exist but the status bar item does, remove it
    statusBarItems["projectConf"].dispose();
    statusBarItems["projectConf"] = undefined;
  }

  statusBarItems["target"] = createStatusBarItem(
    `$(${
      commandDictionary[CommandKeys.SetEspressifTarget].iconId
    }) ${idfTarget}`,
    commandDictionary[CommandKeys.SetEspressifTarget].tooltip,
    CommandKeys.SetEspressifTarget,
    98,
    commandDictionary[CommandKeys.SetEspressifTarget].checkboxState
  );
  statusBarItems["menuconfig"] = createStatusBarItem(
    `$(${commandDictionary[CommandKeys.SDKConfig].iconId})`,
    commandDictionary[CommandKeys.SDKConfig].tooltip,
    CommandKeys.SDKConfig,
    97,
    commandDictionary[CommandKeys.SDKConfig].checkboxState
  );
  statusBarItems["clean"] = createStatusBarItem(
    `$(${commandDictionary[CommandKeys.FullClean].iconId})`,
    commandDictionary[CommandKeys.FullClean].tooltip,
    CommandKeys.FullClean,
    96,
    commandDictionary[CommandKeys.FullClean].checkboxState
  );
  statusBarItems["build"] = createStatusBarItem(
    `$(${commandDictionary[CommandKeys.Build].iconId})`,
    commandDictionary[CommandKeys.Build].tooltip,
    CommandKeys.Build,
    95,
    commandDictionary[CommandKeys.Build].checkboxState
  );
  if (env.uiKind !== UIKind.Web) {
    statusBarItems["flash"] = createStatusBarItem(
      `$(${commandDictionary[CommandKeys.Flash].iconId})`,
      commandDictionary[CommandKeys.Flash].tooltip,
      CommandKeys.Flash,
      94,
      commandDictionary[CommandKeys.Flash].checkboxState
    );
    statusBarItems["monitor"] = createStatusBarItem(
      `$(${commandDictionary[CommandKeys.Monitor].iconId})`,
      commandDictionary[CommandKeys.Monitor].tooltip,
      CommandKeys.Monitor,
      93,
      commandDictionary[CommandKeys.Monitor].checkboxState
    );
    statusBarItems["debug"] = createStatusBarItem(
      `$(${commandDictionary[CommandKeys.Debug].iconId})`,
      commandDictionary[CommandKeys.Debug].tooltip,
      CommandKeys.Debug,
      92,
      commandDictionary[CommandKeys.Debug].checkboxState
    );
    statusBarItems["buildFlashMonitor"] = createStatusBarItem(
      `$(${commandDictionary[CommandKeys.BuildFlashMonitor].iconId})`,
      commandDictionary[CommandKeys.BuildFlashMonitor].tooltip,
      CommandKeys.BuildFlashMonitor,
      91,
      commandDictionary[CommandKeys.BuildFlashMonitor].checkboxState
    );
  }
  statusBarItems["terminal"] = createStatusBarItem(
    `$(${commandDictionary[CommandKeys.IDFTerminal].iconId})`,
    commandDictionary[CommandKeys.IDFTerminal].tooltip,
    CommandKeys.IDFTerminal,
    90,
    commandDictionary[CommandKeys.IDFTerminal].checkboxState
  );
  statusBarItems["espIdf.customTask"] = createStatusBarItem(
    `$(${commandDictionary[CommandKeys.CustomTask].iconId})`,
    commandDictionary[CommandKeys.CustomTask].tooltip,
    CommandKeys.CustomTask,
    89,
    commandDictionary[CommandKeys.CustomTask].checkboxState
  );
  statusBarItems["hints"] = createStatusBarItem(
    l10n.t("💡 New ESP-IDF Hints!"),
    l10n.t("ESP-IDF: Hints available. Click to view."),
    "espIdf.errorHints.focus",
    1000,
    TreeItemCheckboxState.Unchecked
  );
  statusBarItems["hints"].hide();
  return statusBarItems;
}

export function createStatusBarItem(
  icon: string,
  tooltip: string,
  cmd: string,
  priority: number,
  showItem: TreeItemCheckboxState
) {
  const alignment: StatusBarAlignment = StatusBarAlignment.Left;
  const statusBarItem = window.createStatusBarItem(cmd, alignment, priority);
  statusBarItem.name = tooltip;
  statusBarItem.text = icon;
  statusBarItem.tooltip = tooltip;
  statusBarItem.command = cmd;
  if (showItem === TreeItemCheckboxState.Checked) {
    statusBarItem.show();
  }
  return statusBarItem;
}

/**
 * Show the hints status bar item with an alert icon if hints are available
 * @param {boolean} hasHints - Whether hints are available
 */
export function updateHintsStatusBarItem(hasHints: boolean) {
  if (!statusBarItems["hints"]) return;
  if (hasHints) {
    statusBarItems["hints"].text = l10n.t("💡 New ESP-IDF Hints!");
    statusBarItems["hints"].tooltip = l10n.t(
      "ESP-IDF: Hints available. Click to view."
    );
    statusBarItems["hints"].backgroundColor = new ThemeIcon(
      "statusBarItem.warningBackground"
    );
    statusBarItems["hints"].show();
  } else {
    statusBarItems["hints"].hide();
    statusBarItems["hints"].color = undefined;
  }
}

/**
 * Dispose the hints status bar item
 */
export function disposeHintsStatusBarItem() {
  if (statusBarItems["hints"]) {
    statusBarItems["hints"].dispose();
    statusBarItems["hints"] = undefined;
  }
}
