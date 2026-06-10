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

import { ExtensionContext } from "vscode";
import { registerIDFCommand } from "../../common/registerCommand";
import { openFolderCheck } from "../../common/PreCheck";
import { ConfserverProcess } from "./confserver/confServerProcess";
import { Logger } from "../../common/logger";
import { withProgressWrapper } from "../../common/withProgressWrapper";
import { createClassicMenuconfig } from "./classicTerminal";

export function registerMenuconfigCommands(context: ExtensionContext) {
  registerIDFCommand(context, "espIdf.menuconfig.start", async () => {
    await withProgressWrapper(
      [openFolderCheck],
      "ESP-IDF: SDK Configuration Editor",
      async (_progress, cancelToken, wsFolder) => {
        try {
          if (ConfserverProcess.exists()) {
            ConfserverProcess.loadExistingInstance();
            return;
          }
          ConfserverProcess.registerProgress(_progress);
          cancelToken.onCancellationRequested(() => {
            ConfserverProcess.dispose();
          });
          await ConfserverProcess.init(wsFolder.uri, context.extensionPath);
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          Logger.errorNotify(
            err.message,
            err,
            "registerMenuconfigCommands menuconfig start"
          );
        }
      }
    );
  });

  registerIDFCommand(context, "espIdf.disposeConfserverProcess", () => {
    try {
      if (ConfserverProcess.exists()) {
        ConfserverProcess.dispose();
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      Logger.errorNotify(
        err.message,
        err,
        "registerMenuconfigCommands disposeConfserverProcess"
      );
    }
  });

  registerIDFCommand(context, "espIdf.createClassicMenuconfig", () =>
    createClassicMenuconfig(context.extensionPath)
  );
}
