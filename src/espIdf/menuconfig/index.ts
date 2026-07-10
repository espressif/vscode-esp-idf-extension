/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 27th April 2026 6:49:50 pm
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

import { ExtensionContext, l10n } from "vscode";
import { registerIDFCommand } from "../../common/registerCommand";
import {
  minIdfVersionCheck,
  openFolderCheck,
} from "../../common/PreCheck";
import { ConfserverProcess } from "./confserver/confServerProcess";
import { withProgressWrapper } from "../../common/withProgressWrapper";
import { createClassicMenuconfig } from "./classicTerminal";
import { addMenuConfigFileWatchers } from "./fileWatchers";
import { saveDefSdkconfig } from "./saveDefConfig";
import { ESP } from "../../config";

function registerMenuconfigCommand(
  context: ExtensionContext,
  name: string,
  callback: (...args: any[]) => any
) {
  registerIDFCommand(context, name, callback, {
    outputChannel: "SDK Configuration Editor",
  });
}

export function registerMenuconfigCommands(context: ExtensionContext) {
  registerMenuconfigCommand(context, "espIdf.menuconfig.start", async () => {
    await withProgressWrapper(
      [openFolderCheck],
      "ESP-IDF: SDK Configuration Editor",
      async (_progress, cancelToken) => {
        if (ConfserverProcess.exists()) {
          ConfserverProcess.loadExistingInstance();
          return;
        }
        ConfserverProcess.registerProgress(_progress);
        cancelToken.onCancellationRequested(() => {
          ConfserverProcess.dispose();
        });
        const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
        await ConfserverProcess.init(wsFolder.uri, context.extensionPath);
      }
    );
  });

  registerMenuconfigCommand(context, "espIdf.disposeConfserverProcess", () => {
    if (ConfserverProcess.exists()) {
      ConfserverProcess.dispose();
    }
  });

  registerMenuconfigCommand(context, "espIdf.createClassicMenuconfig", () =>
    createClassicMenuconfig(context.extensionPath)
  );

  registerMenuconfigCommand(context, "espIdf.saveDefSdkconfig", async () => {
    const idfVersionCheck = await minIdfVersionCheck("5.0");
    await withProgressWrapper(
      [idfVersionCheck, openFolderCheck],
      l10n.t("ESP-IDF: Save Default Configuration (save-defconfig)"),
      async (_progress, cancelToken) => {
        const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
        await saveDefSdkconfig(wsFolder.uri, cancelToken);
      }
    );
  });

  addMenuConfigFileWatchers(context);
}
