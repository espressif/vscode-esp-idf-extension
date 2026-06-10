/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 3rd June 2026 3:36:23 pm
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

import { l10n, TerminalLocation } from "vscode";
import { openFolderCheck, PreCheck } from "../../common/PreCheck";
import { ESP } from "../../config";
import { readParameter } from "../../configuration/idf";
import { createEspIdfTerminal } from "../../terminal";
import { Logger } from "../../common/logger";

export async function createClassicMenuconfig(extensionPath: string) {
  PreCheck.perform([openFolderCheck], async () => {
    const workspaceFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
    if (!workspaceFolder) {
        Logger.infoNotify(l10n.t("Open a folder first."));
        return;
      }
    // Get build directory and sdkconfig file from settings
    const buildDirPath = readParameter(
      "idf.buildPath",
      workspaceFolder
    ) as string;
    const sdkconfigFilePath = readParameter(
      "idf.sdkconfigFilePath",
      workspaceFolder
    ) as string;
    const sdkconfigDefaults = readParameter(
      "idf.sdkconfigDefaults",
      workspaceFolder
    ) as string[];

    // Build the idf.py menuconfig command with optional parameters
    let menuconfigCommand = "idf.py";
    if (buildDirPath) {
      menuconfigCommand += ` -B "${buildDirPath}"`;
    }
    if (sdkconfigFilePath) {
      menuconfigCommand += ` -DSDKCONFIG='${sdkconfigFilePath}'`;
    }
    if (sdkconfigDefaults && sdkconfigDefaults.length > 0) {
      menuconfigCommand += ` -DSDKCONFIG_DEFAULTS="${sdkconfigDefaults.join(
        ";"
      )}"`;
    }
    menuconfigCommand += ` -C '${workspaceFolder.uri.fsPath}' menuconfig`;

    const currentSelectedConfig = ESP.ProjectConfiguration.store.get<string>(
      ESP.ProjectConfiguration.SELECTED_CONFIG
    );

    const terminalName = `ESP-IDF Menuconfig${
      currentSelectedConfig ? ` - (${currentSelectedConfig})` : ""
    }`;

    await createEspIdfTerminal(
      extensionPath,
      terminalName,
      menuconfigCommand,
      TerminalLocation.Editor
    );
  });
}
